import { HttpStatus, Logger } from "@nestjs/common";
import { AppError, toArray } from "@tsg-dsp/common-api";
import {
  PresentationValidation,
  VerifiablePresentation,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import { DcqlQuery, OID4VPAuthorizationResponse } from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";
import { decodeJwt } from "jose";

import { TrustAnchor } from "../model.js";
import { verifyCredentialValidity } from "./credential-validity.js";
import {
  validateCredentialSets,
  validateDcqlConstraints
} from "./dcql-constraints.js";
import { validateJwt } from "./jwt.js";

export async function verifyPresentationValidity(
  vpJwt: VerifiablePresentationJwt,
  trustAnchors: TrustAnchor[],
  audience?: string,
  nonce?: string
): Promise<PresentationValidation> {
  const jwtPayload = decodeJwt(vpJwt.vp);
  let presentation: VerifiablePresentation;
  let validateJWTSignature: boolean;
  const type = toArray(jwtPayload.type as string[] | string | undefined);
  if (type.includes("EnvelopedVerifiablePresentation")) {
    // enveloped presentation (https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose)
    if (
      !jwtPayload.id ||
      typeof jwtPayload.id !== "string" ||
      !jwtPayload.id.startsWith("data:application/vp+jwt,")
    ) {
      throw new AppError(
        `Invalid EnvelopedVerifiablePresentation id: ${jwtPayload.id}`,
        HttpStatus.BAD_REQUEST
      ).andLog(new Logger("verifyPresentationValidity"), "debug");
    }
    const envelopedJwt = jwtPayload.id.replace("data:application/vp+jwt,", "");
    presentation = plainToInstance(
      VerifiablePresentation,
      decodeJwt(envelopedJwt)
    );
    validateJWTSignature =
      (await validatePresentationJwt(envelopedJwt, false)) &&
      (await validatePresentationJwt(vpJwt.vp, true));
  } else if (type.includes("VerifiablePresentation")) {
    // application/vp+jwt presentation (https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose)
    validateJWTSignature = await validatePresentationJwt(vpJwt.vp, false);
    presentation = plainToInstance(VerifiablePresentation, jwtPayload);
  } else if (jwtPayload.vp && typeof jwtPayload.vp === "object") {
    // jwt_vp presentation (https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose)
    validateJWTSignature = await validatePresentationJwt(vpJwt.vp, true);
    presentation = plainToInstance(VerifiablePresentation, jwtPayload.vp);
  } else {
    Logger.warn("Invalid VerifiablePresentation format", "lib - presentation");
    Logger.debug(`JWT: ${JSON.stringify(vpJwt)}`, "lib - presentation");
    throw new AppError(
      `Invalid VerifiablePresentation`,
      HttpStatus.BAD_REQUEST
    );
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
      toArray(presentation.verifiableCredential).map((vc) =>
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
    presentation,
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
  Logger.log(
    `Evaluating presentation response for audience: ${audience}`,
    "PresentationValidation"
  );
  Logger.debug(
    `Definition: ${JSON.stringify(dcqlQuery)}`,
    "PresentationValidation"
  );
  Logger.debug(
    `Response: ${JSON.stringify(response)}`,
    "PresentationValidation"
  );
  const verifiablePresentations: VerifiablePresentation[] = [];

  // Collect all validation promises to avoid await in loop
  const allValidationPromises: Promise<VerifiablePresentation>[] = [];

  // Validate each credential query against the provided VP tokens
  for (const credentialQuery of dcqlQuery.credentials) {
    Logger.debug(
      `Processing credential query: ${JSON.stringify(credentialQuery)}`,
      "PresentationValidation"
    );

    const credentialId = credentialQuery.id;
    const vpTokens = response.vp_token[credentialId];

    Logger.debug(
      `VP tokens for ${credentialId}: ${JSON.stringify(vpTokens)}`,
      "PresentationValidation"
    );
    if (!vpTokens || vpTokens.length === 0) {
      throw new AppError(
        `No VP tokens found for credential query ${credentialId}`,
        HttpStatus.FORBIDDEN
      ).andLog(new Logger("PresentationValidation"), "debug");
    }

    // Process each VP token for this credential query
    const vpValidationPromises = vpTokens.map(async (vpToken) => {
      const vpValidation = await verifyPresentationValidity(
        { vp: vpToken },
        trustAnchors,
        audience,
        nonce
      );

      validateDcqlConstraints(
        credentialQuery,
        vpValidation.presentation,
        trustAnchors
      );

      if (!vpValidation.valid) {
        throw new AppError(
          `Invalid verifiable presentation for ${credentialId}: ${JSON.stringify(vpValidation)}`,
          HttpStatus.FORBIDDEN
        ).andLog(new Logger("PresentationValidation"), "debug");
      }

      return vpValidation.presentation;
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

export async function validatePresentationJwt(
  jwt: string,
  extendedValidation: boolean
) {
  try {
    await validateJwt(
      jwt,
      extendedValidation
        ? undefined
        : {
            validateIssuer: false,
            validateJti: false
          }
    );
    return true;
  } catch (e: unknown) {
    Logger.warn(
      `Could not validate JWT signature: ${e instanceof Error ? e.message : e}`,
      "PresentationValidation"
    );
    return false;
  }
}
