import { HttpStatus, Logger } from "@nestjs/common";
import { AppError, toArray } from "@tsg-dsp/common-api";
import {
  CredentialContainer,
  formatCredentials,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  ClaimsQuery,
  CredentialQuery,
  CredentialSetQuery,
  TrustedAuthoritiesQuery,
  VpToken
} from "@tsg-dsp/common-dtos";

import { TrustAnchor } from "../model.js";

/**
 * Validates DCQL constraints against a verifiable presentation
 */
export function validateDcqlConstraints(
  credentialQuery: CredentialQuery,
  vp: VerifiablePresentation,
  trustAnchors: TrustAnchor[]
): void {
  const credentials = formatCredentials(toArray(vp.verifiableCredential));

  for (const credential of credentials) {
    if (credentialQuery.meta) {
      validateFormatConstraints(credentialQuery, credential);
    }

    if (credentialQuery.trusted_authorities) {
      validateTrustedAuthorities(
        credentialQuery.trusted_authorities,
        credential,
        trustAnchors
      );
    }

    if (credentialQuery.claims) {
      validateClaims(credentialQuery.claims, credential);
    }

    if (credentialQuery.claim_sets) {
      validateClaimSets(credentialQuery.claim_sets, credential);
    }
  }
}

/**
 * Validates format-specific constraints from DCQL meta
 */
export function validateFormatConstraints(
  credentialQuery: CredentialQuery,
  container: CredentialContainer
): void {
  const meta = credentialQuery.meta;

  // Validate SD-JWT VC constraints
  if (meta.vct_values && meta.vct_values.length > 0) {
    // For SD-JWT VC, check the vct claim
    const vctClaim = (
      container.credential as unknown as Record<string, unknown>
    ).vct;
    if (!vctClaim || !meta.vct_values.includes(vctClaim as string)) {
      throw new AppError(
        `Credential vct ${vctClaim} not in allowed values: ${meta.vct_values.join(", ")}`,
        HttpStatus.FORBIDDEN
      ).andLog(new Logger("DCQLConstraints"), "debug");
    }
  }

  // Validate W3C VC type constraints
  if (meta.type_values && meta.type_values.length > 0) {
    const credentialTypes = container.credential.type || [];
    const hasValidType = meta.type_values.some((allowedTypes: string[]) =>
      allowedTypes.every((type) => credentialTypes.includes(type))
    );
    if (!hasValidType) {
      throw new AppError(
        `Credential types ${credentialTypes.join(", ")} do not match allowed types`,
        HttpStatus.FORBIDDEN
      ).andLog(new Logger("DCQLConstraints"), "debug");
    }
  }

  // Validate mDoc constraints
  if (meta.doctype_value) {
    const doctype = (container.credential as unknown as Record<string, unknown>)
      .doctype;
    if (!doctype || doctype !== meta.doctype_value) {
      throw new AppError(
        `Credential doctype ${doctype} does not match required ${meta.doctype_value}`,
        HttpStatus.FORBIDDEN
      ).andLog(new Logger("DCQLConstraints"), "debug");
    }
  }
}

/**
 * Validates trusted authorities constraints
 */
export function validateTrustedAuthorities(
  trustedAuthorities: TrustedAuthoritiesQuery[],
  container: CredentialContainer,
  trustAnchors: TrustAnchor[]
): void {
  for (const trustAuth of trustedAuthorities) {
    switch (trustAuth.type) {
      case "openid_federation": {
        // Validate against OpenID Federation trust anchors
        const federationAnchors = trustAnchors.filter((ta) =>
          trustAuth.values.includes(ta.identifier)
        );
        if (federationAnchors.length === 0) {
          throw new AppError(
            `No trusted federation anchor found for issuer ${container.credential.issuer}`,
            HttpStatus.FORBIDDEN
          ).andLog(new Logger("DCQLConstraints"), "debug");
        }
        break;
      }

      case "etsi_tl": {
        // Validate against ETSI Trust List
        // Implementation would depend on ETSI TL structure
        throw new AppError(
          "ETSI Trust List validation not yet implemented",
          HttpStatus.NOT_IMPLEMENTED
        ).andLog(new Logger("DCQLConstraints"), "debug");
      }

      case "aki": {
        // Validate against Authority Key Identifier
        // Implementation would depend on AKI structure
        throw new AppError(
          "AKI validation not yet implemented",
          HttpStatus.NOT_IMPLEMENTED
        ).andLog(new Logger("DCQLConstraints"), "debug");
      }

      default:
        throw new AppError(
          `Unknown trusted authority type: ${trustAuth.type}`,
          HttpStatus.BAD_REQUEST
        ).andLog(new Logger("DCQLConstraints"), "debug");
    }
  }
}

/**
 * Validates individual claims constraints
 */
export function validateClaims(
  claims: ClaimsQuery[],
  container: CredentialContainer
): void {
  for (const claimQuery of claims) {
    const claimPath = claimQuery.path;
    let claimValue: unknown;

    try {
      claimValue = getValueByPath(
        container.credential as unknown as Record<string, unknown>,
        claimPath
      );
    } catch {
      throw new AppError(
        `Required claim at path ${claimPath.join(".")} not found in credential`,
        HttpStatus.FORBIDDEN
      ).andLog(new Logger("DCQLConstraints"), "debug");
    }

    // Validate expected values if specified
    if (claimQuery.values && claimQuery.values.length > 0) {
      if (
        !claimQuery.values.includes(claimValue as string | number | boolean)
      ) {
        throw new AppError(
          `Claim value ${claimValue} not in expected values: ${claimQuery.values.join(", ")}`,
          HttpStatus.FORBIDDEN
        ).andLog(new Logger("DCQLConstraints"), "debug");
      }
    }
  }
}

/**
 * Validates claim sets constraints
 */
export function validateClaimSets(
  claimSets: string[][],
  container: CredentialContainer
): void {
  // At least one claim set must be satisfied
  const satisfiedSets = claimSets.filter((claimSet) => {
    return claimSet.every((claimPath) => {
      try {
        getValueByPath(
          container.credential as unknown as Record<string, unknown>,
          claimPath.split(".")
        );
        return true;
      } catch {
        return false;
      }
    });
  });

  if (satisfiedSets.length === 0) {
    throw new AppError(
      "No claim set satisfied by the credential",
      HttpStatus.FORBIDDEN
    ).andLog(new Logger("DCQLConstraints"), "debug");
  }
}

/**
 * Validates credential sets constraints
 */
export function validateCredentialSets(
  credentialSets: CredentialSetQuery[],
  vpToken: VpToken
): void {
  for (const credentialSet of credentialSets) {
    if (credentialSet.required !== false) {
      // At least one option must be satisfied
      const satisfiedOptions = credentialSet.options.filter(
        (option: string[]) => {
          return option.every(
            (credentialId) =>
              vpToken[credentialId] && vpToken[credentialId].length > 0
          );
        }
      );

      if (satisfiedOptions.length === 0) {
        throw new AppError(
          `Required credential set not satisfied. Expected one of: ${JSON.stringify(credentialSet.options)}`,
          HttpStatus.FORBIDDEN
        ).andLog(new Logger("DCQLConstraints"), "debug");
      }
    }
  }
}

/**
 * Helper function to get a value by path from an object (recursive)
 */
export function getValueByPath(
  obj: Record<string, unknown> | unknown[],
  path: (string | number | null)[]
): unknown {
  if (path.length === 0) {
    return obj;
  }

  const [segment, ...rest] = path;

  if (segment === null) {
    // null means select all array elements
    if (!Array.isArray(obj)) {
      throw new Error("Cannot use null selector on non-array");
    }
    // Map the rest of the path for each element
    return obj.map((item) =>
      getValueByPath(item as Record<string, unknown> | unknown[], rest)
    );
  }

  if (obj === null || obj === undefined) {
    throw new Error("Path not found");
  }

  // Support both array and object access
  if (Array.isArray(obj)) {
    if (typeof segment !== "number") {
      throw new Error("Array index must be a number");
    }
    if (segment < 0 || segment >= obj.length) {
      throw new Error("Array index out of bounds");
    }
    return getValueByPath(
      obj[segment] as Record<string, unknown> | unknown[],
      rest
    );
  } else {
    const parent = obj as Record<string, unknown>;
    if (!(segment in parent)) {
      throw new Error("Path not found");
    }
    return getValueByPath(
      parent[segment] as Record<string, unknown> | unknown[],
      rest
    );
  }
}
