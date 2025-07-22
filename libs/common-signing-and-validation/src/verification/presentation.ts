import { Bitstring } from "@digitalbazaar/bitstring";
import { HttpStatus } from "@nestjs/common";
import { AppError, toArray } from "@tsg-dsp/common-api";
import {
  BitstringStatusList,
  DataIntegrityProof,
  JsonWebSignature2020,
  PresentationValidation,
  Proof,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import {
  ClaimsQuery,
  CredentialQuery,
  CredentialSetQuery,
  DcqlQuery,
  Field,
  OID4VPAuthorizationResponse,
  TrustedAuthoritiesQuery,
  VerifiedCredentialStatus,
  VpToken
} from "@tsg-dsp/common-dtos";
import { Ajv } from "ajv";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { decodeJwt } from "jose";
import jsonpath from "jsonpath";

import { TrustAnchor } from "../model.js";
import { base58btcToBase64url } from "../utils/typeconverter.js";
import {
  validateDataIntegrityProof,
  validateJsonWebSignature2020,
  validateJwt
} from "./validate.js";

const ajv = new Ajv();

interface CacheEntry {
  time: number;
  context: VerifiableCredential<Proof, BitstringStatusList>;
}

export const cachedStatusCredentials = new Map<string, CacheEntry>();

export function validateField(
  fieldDescriptor: Field,
  vpJson: any,
  throwOnError = true
): {
  error: boolean;
  found: boolean;
  validated?: boolean;
  message?: string;
} {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let field: any | undefined = undefined;
  for (const path of fieldDescriptor.path) {
    const queryResult = jsonpath.query(vpJson, path, 1);
    if (queryResult[0]) {
      field = queryResult[0];
      break;
    }
  }
  if (field === undefined) {
    if (fieldDescriptor.optional === true) {
      return {
        error: false,
        found: false,
        validated: false
      };
    } else {
      if (throwOnError) {
        throw new AppError(
          `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`,
          HttpStatus.FORBIDDEN
        );
      } else {
        return {
          error: true,
          found: false,
          message: `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`
        };
      }
    }
  }
  if (fieldDescriptor.filter) {
    const validate = ajv.compile(fieldDescriptor.filter);
    if (Array.isArray(field) && fieldDescriptor.filter.type !== "array") {
      let validated = false;
      for (const item of field) {
        if (validate(item)) {
          validated = true;
          break;
        }
      }
      if (!validated) {
        if (throwOnError) {
          throw new AppError(
            `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          );
        } else {
          return {
            error: true,
            found: true,
            validated: false,
            message: `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`
          };
        }
      }
    } else {
      if (!validate(field)) {
        if (throwOnError) {
          throw new AppError(
            `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          );
        } else {
          return {
            error: true,
            found: true,
            validated: false,
            message: `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`
          };
        }
      }
    }
  }
  return {
    error: false,
    found: true,
    validated: true
  };
}

export async function getStatusCredential(
  statusListCredential: string,
  disableCache: boolean = false
): Promise<VerifiableCredential<Proof, BitstringStatusList>> {
  const cacheEntry = cachedStatusCredentials.get(statusListCredential);
  if (!disableCache && cacheEntry) {
    if (cacheEntry.time + 24 * 60 * 60 * 1000 > new Date().getTime()) {
      return cacheEntry.context;
    }
  }
  try {
    const response =
      await axios.get<VerifiableCredential<Proof, BitstringStatusList>>(
        statusListCredential
      );
    const parsedCredential = plainToInstance(
      VerifiableCredential<Proof, BitstringStatusList>,
      response.data
    );

    cachedStatusCredentials.set(statusListCredential, {
      time: new Date().getTime(),
      context: parsedCredential
    });
    return parsedCredential;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      throw new AppError(
        `Could not fetch StatusListCredential ${statusListCredential}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }
    throw new AppError(
      `Unknown error during retrieval of StatusListCredential ${statusListCredential}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }
}

export async function verifyCredentialStatusValidity(
  statusListCredential: string,
  position: string,
  disableCache: boolean,
  trustAnchors: TrustAnchor[]
): Promise<VerifiedCredentialStatus> {
  const credential = await getStatusCredential(
    statusListCredential,
    disableCache
  );
  const validationResult = await verifyCredentialValidity(
    credential,
    trustAnchors
  );
  if (!validationResult.validProof || !validationResult.validExpiryDate) {
    throw new AppError(
      `Could not validate StatusListCredential ${statusListCredential}`,
      HttpStatus.BAD_REQUEST
    );
  }
  try {
    let encodedList = toArray(credential.credentialSubject)[0].encodedList;
    if (encodedList.startsWith("z")) {
      encodedList = base58btcToBase64url(encodedList.slice(1));
    } else {
      encodedList = encodedList.slice(1);
    }
    const buffer = await Bitstring.decodeBits({ encoded: encodedList });
    const bitstring = new Bitstring({ buffer });
    return plainToInstance(VerifiedCredentialStatus, {
      statusListCredential: statusListCredential,
      statusListIndex: position,
      statusPurpose: toArray(credential.credentialSubject)[0].statusPurpose,
      status: bitstring.get(parseInt(position))
    });
  } catch (error) {
    throw new AppError(
      `Could not verify position ${position} in StatusListCredential ${statusListCredential}`,
      HttpStatus.BAD_REQUEST,
      error
    );
  }
}

export async function verifyCredentialValidity(
  credential: VerifiableCredential,
  trustAnchors: TrustAnchor[]
): Promise<{
  validExpiryDate: boolean;
  validTrustAnchors: boolean;
  validProof: boolean;
  validStatus: boolean;
}> {
  let validExpiryDate = false;
  let validTrustAnchors = false;
  let validProof = false;
  let validStatus = true;
  try {
    if (credential.validUntil) {
      validExpiryDate =
        new Date(credential.validUntil).getTime() > new Date().getTime();
    } else if (credential.expirationDate) {
      validExpiryDate =
        new Date(credential.expirationDate).getTime() > new Date().getTime();
    } else {
      validExpiryDate = true;
    }

    if (credential.credentialStatus) {
      for (const status of toArray(credential.credentialStatus)) {
        if (
          status.type === "BitstringStatusListEntry" &&
          ["revocation", "suspension"].includes(status.statusPurpose)
        ) {
          const verifiedStatus = await verifyCredentialStatusValidity(
            status.id,
            status.statusListIndex,
            false,
            trustAnchors
          );
          if (verifiedStatus.status) {
            validStatus = false;
          }
        }
      }
    }
    const credentialTypes =
      trustAnchors.find(
        (trustAnchor: TrustAnchor) =>
          trustAnchor.identifier === credential.issuer
      )?.credentialTypes || [];

    validTrustAnchors = credential.type
      .filter((t) => t !== "VerifiableCredential")
      .every((type) => credentialTypes.includes(type));

    const { proof, ...plainCredential } = credential;
    try {
      for (const proofItem of toArray(proof)) {
        if (
          proofItem instanceof JsonWebSignature2020 ||
          proofItem.type === "JsonWebSignature2020"
        ) {
          await validateJsonWebSignature2020(
            plainCredential,
            proofItem as JsonWebSignature2020
          );
        } else if (
          proofItem instanceof DataIntegrityProof ||
          proofItem.type === "DataIntegrityProof"
        ) {
          await validateDataIntegrityProof(
            plainCredential,
            proofItem as DataIntegrityProof
          );
        } else {
          throw new AppError(
            `Unknown proof ${proofItem.type}`,
            HttpStatus.BAD_REQUEST
          );
        }
      }
      validProof = true;
    } catch (e) {
      console.log(e);
    }
  } catch (e) {
    console.log(e);
  }
  return {
    validExpiryDate: validExpiryDate,
    validTrustAnchors: validTrustAnchors,
    validProof: validProof,
    validStatus: validStatus
  };
}

export async function verifyPresentationValidity(
  vpJwt: VerifiablePresentationJwt,
  trustAnchors: TrustAnchor[],
  audience?: string,
  nonce?: string
): Promise<PresentationValidation> {
  const jwtPayload = decodeJwt(vpJwt.vp);
  const vp = plainToInstance(VerifiablePresentation, jwtPayload.vp);

  let validateJWTSignature: boolean;
  try {
    await validateJwt(vpJwt.vp);
    validateJWTSignature = true;
  } catch (e: unknown) {
    console.warn(`Could not validate JWT signature: ${e}`);
    validateJWTSignature = false;
  }

  const validateAudience = audience ? jwtPayload.aud === audience : undefined;
  // OID4VP 1.0: If no exp claim is present, the VP is considered valid (not expired)
  const validateJWTExpiryDate = jwtPayload.exp
    ? jwtPayload.exp > new Date().getTime() / 1000
    : true;

  // OID4VP 1.0: Validate nonce for replay protection
  const validateNonce = nonce ? jwtPayload.nonce === nonce : undefined;

  const { validExpiryDate, validTrustAnchors, validProof, validStatus } = (
    await Promise.all(
      toArray(vp.verifiableCredential).map((vc) =>
        verifyCredentialValidity(vc, trustAnchors)
      )
    )
  ).reduce(
    (acc, current) => {
      return {
        validExpiryDate: [...acc.validExpiryDate, current.validExpiryDate],
        validTrustAnchors: [
          ...acc.validTrustAnchors,
          current.validTrustAnchors
        ],
        validProof: [...acc.validProof, current.validProof],
        validStatus: [...acc.validStatus, current.validStatus]
      };
    },
    {
      validExpiryDate: [] as boolean[],
      validTrustAnchors: [] as boolean[],
      validProof: [] as boolean[],
      validStatus: [] as boolean[]
    }
  );

  const valid =
    validateJWTSignature &&
    (validateAudience !== undefined ? validateAudience : true) &&
    validateJWTExpiryDate &&
    (validateNonce !== undefined ? validateNonce : true) &&
    validProof.every((r) => r) &&
    validExpiryDate.every((r) => r) &&
    validStatus.every((r) => r);

  return {
    vp: vpJwt.vp,
    valid: valid,
    validExpiryDate: validExpiryDate,
    validProof: validProof,
    validStatus: validStatus,
    validTrustAnchors: validTrustAnchors,
    validateJWTSignature: validateJWTSignature,
    validateJWTExpiryDate: validateJWTExpiryDate,
    validateAudience: validateAudience,
    ...(validateNonce !== undefined && { validateNonce })
  };
}

export async function evaluatePresentationResponseValidity(
  dcqlQuery: DcqlQuery,
  response: OID4VPAuthorizationResponse,
  trustAnchors: TrustAnchor[],
  audience?: string,
  nonce?: string
): Promise<VerifiablePresentation[]> {
  console.log("Evaluating presentation response");
  console.debug(`VP token: ${response.vp_token}`);
  console.debug(`Definition: ${JSON.stringify(dcqlQuery)}`);
  console.debug(`Response: ${JSON.stringify(response)}`);
  const verifiablePresentations: VerifiablePresentation[] = [];

  // Collect all validation promises to avoid await in loop
  const allValidationPromises: Promise<VerifiablePresentation>[] = [];

  // Validate each credential query against the provided VP tokens
  for (const credentialQuery of dcqlQuery.credentials) {
    console.debug(
      `Processing credential query: ${JSON.stringify(credentialQuery)}`
    );

    const credentialId = credentialQuery.id;
    const vpTokens = response.vp_token[credentialId];

    console.debug(`VP tokens for ${credentialId}: ${JSON.stringify(vpTokens)}`);
    if (!vpTokens || vpTokens.length === 0) {
      throw new AppError(
        `No VP tokens found for credential query ${credentialId}`,
        HttpStatus.FORBIDDEN
      );
    }

    // Process each VP token for this credential query
    const vpValidationPromises = vpTokens.map(async (vpToken) => {
      const vpJwt = decodeJwt(vpToken);
      const vpJson = vpJwt.vp;
      const vp = plainToInstance(VerifiablePresentation, vpJson);

      validateDcqlConstraints(credentialQuery, vp, trustAnchors);

      const vpValidation = await verifyPresentationValidity(
        { vp: vpToken },
        trustAnchors,
        audience,
        nonce
      );

      if (!vpValidation.valid) {
        throw new AppError(
          `Invalid verifiable presentation for ${credentialId}: ${JSON.stringify(vpValidation)}`,
          HttpStatus.FORBIDDEN
        );
      }

      return vp;
    });

    allValidationPromises.push(...vpValidationPromises);
  }

  // Wait for all VP validations
  const validatedVPs = await Promise.all(allValidationPromises);
  verifiablePresentations.push(...validatedVPs);

  if (dcqlQuery.credential_sets) {
    validateCredentialSets(dcqlQuery.credential_sets, response.vp_token);
  }

  return verifiablePresentations;
}

/**
 * Validates DCQL constraints against a verifiable presentation
 */
export function validateDcqlConstraints(
  credentialQuery: CredentialQuery,
  vp: VerifiablePresentation,
  trustAnchors: TrustAnchor[]
): void {
  const credentials = toArray(vp.verifiableCredential);

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
  credential: VerifiableCredential
): void {
  const meta = credentialQuery.meta;

  // Validate SD-JWT VC constraints
  if (meta.vct_values && meta.vct_values.length > 0) {
    // For SD-JWT VC, check the vct claim
    const vctClaim = (credential as unknown as Record<string, unknown>).vct;
    if (!vctClaim || !meta.vct_values.includes(vctClaim as string)) {
      throw new AppError(
        `Credential vct ${vctClaim} not in allowed values: ${meta.vct_values.join(", ")}`,
        HttpStatus.FORBIDDEN
      );
    }
  }

  // Validate W3C VC type constraints
  if (meta.type_values && meta.type_values.length > 0) {
    const credentialTypes = credential.type || [];
    const hasValidType = meta.type_values.some((allowedTypes: string[]) =>
      allowedTypes.every((type) => credentialTypes.includes(type))
    );
    if (!hasValidType) {
      throw new AppError(
        `Credential types ${credentialTypes.join(", ")} do not match allowed types`,
        HttpStatus.FORBIDDEN
      );
    }
  }

  // Validate mDoc constraints
  if (meta.doctype_value) {
    const doctype = (credential as unknown as Record<string, unknown>).doctype;
    if (!doctype || doctype !== meta.doctype_value) {
      throw new AppError(
        `Credential doctype ${doctype} does not match required ${meta.doctype_value}`,
        HttpStatus.FORBIDDEN
      );
    }
  }
}

/**
 * Validates trusted authorities constraints
 */
export function validateTrustedAuthorities(
  trustedAuthorities: TrustedAuthoritiesQuery[],
  credential: VerifiableCredential,
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
            `No trusted federation anchor found for issuer ${credential.issuer}`,
            HttpStatus.FORBIDDEN
          );
        }
        break;
      }

      case "etsi_tl": {
        // Validate against ETSI Trust List
        // Implementation would depend on ETSI TL structure
        throw new AppError(
          "ETSI Trust List validation not yet implemented",
          HttpStatus.NOT_IMPLEMENTED
        );
      }

      case "aki": {
        // Validate against Authority Key Identifier
        // Implementation would depend on AKI structure
        throw new AppError(
          "AKI validation not yet implemented",
          HttpStatus.NOT_IMPLEMENTED
        );
      }

      default:
        throw new AppError(
          `Unknown trusted authority type: ${trustAuth.type}`,
          HttpStatus.BAD_REQUEST
        );
    }
  }
}

/**
 * Validates individual claims constraints
 */
export function validateClaims(
  claims: ClaimsQuery[],
  credential: VerifiableCredential
): void {
  for (const claimQuery of claims) {
    const claimPath = claimQuery.path;
    let claimValue: unknown;

    try {
      claimValue = getValueByPath(
        credential as unknown as Record<string, unknown>,
        claimPath
      );
    } catch {
      throw new AppError(
        `Required claim at path ${claimPath.join(".")} not found in credential`,
        HttpStatus.FORBIDDEN
      );
    }

    // Validate expected values if specified
    if (claimQuery.values && claimQuery.values.length > 0) {
      if (
        !claimQuery.values.includes(claimValue as string | number | boolean)
      ) {
        throw new AppError(
          `Claim value ${claimValue} not in expected values: ${claimQuery.values.join(", ")}`,
          HttpStatus.FORBIDDEN
        );
      }
    }
  }
}

/**
 * Validates claim sets constraints
 */
export function validateClaimSets(
  claimSets: string[][],
  credential: VerifiableCredential
): void {
  // At least one claim set must be satisfied
  const satisfiedSets = claimSets.filter((claimSet) => {
    return claimSet.every((claimPath) => {
      try {
        getValueByPath(
          credential as unknown as Record<string, unknown>,
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
    );
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
        );
      }
    }
  }
}

/**
 * Helper function to get a value by path from an object
 */
export function getValueByPath(
  obj: Record<string, unknown>,
  path: (string | number | null)[]
): unknown {
  let current: unknown = obj;

  for (const segment of path) {
    if (segment === null) {
      // null means select all array elements
      if (!Array.isArray(current)) {
        throw new Error("Cannot use null selector on non-array");
      }
      continue;
    }

    if (current === null || current === undefined) {
      throw new Error("Path not found");
    }

    const parent = current as Record<string, unknown>;
    if (!(segment in parent)) {
      throw new Error("Path not found");
    }

    current = parent[segment];
  }

  return current;
}
