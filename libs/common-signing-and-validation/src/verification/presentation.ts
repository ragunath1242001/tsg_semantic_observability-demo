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
  Field,
  PresentationDefinition,
  PresentationResponse,
  VerifiedCredentialStatus
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
  audience?: string
): Promise<PresentationValidation> {
  const jwtPayload = decodeJwt(vpJwt.vp);
  const vp = plainToInstance(VerifiablePresentation, jwtPayload.vp);

  let validateJWTSignature: boolean;
  try {
    await validateJwt(vpJwt.vp);
    validateJWTSignature = true;
  } catch (e: any) {
    console.warn(`Could not validate JWT signature: ${e}`);
    validateJWTSignature = false;
  }

  const validateAudience = audience ? jwtPayload.aud === audience : undefined;
  const validateJWTExpiryDate = jwtPayload.exp
    ? jwtPayload.exp > new Date().getTime() / 1000
    : false;

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
    validateAudience: validateAudience
  };
}

export async function evaluatePresentationResponseValidity(
  definition: PresentationDefinition,
  response: PresentationResponse,
  trustAnchors: TrustAnchor[]
): Promise<VerifiablePresentation> {
  const vpValidation = await verifyPresentationValidity(
    {
      vp: response.vp_token
    },
    trustAnchors
  );
  if (!vpValidation.valid) {
    throw new AppError(
      `Invalid verifiable presentation ${JSON.stringify(vpValidation)}`,
      HttpStatus.FORBIDDEN
    );
  }
  const vpJwt = decodeJwt(response.vp_token);
  const vpJson = vpJwt.vp;

  for (const inputDescriptor of definition.input_descriptors) {
    const descriptor = response.presentation_submission.descriptor_map.find(
      (d) => d.id === inputDescriptor.id
    );
    if (!descriptor) {
      throw new AppError(
        `No descriptor map found for input descriptor ${inputDescriptor.id} (${inputDescriptor.name})`,
        HttpStatus.FORBIDDEN
      );
    }
    const queryResult = jsonpath.query(vpJson, descriptor.path, 1);
    if (!queryResult[0]) {
      throw new AppError(
        `Descriptor path ${descriptor.path} not found in VP (${inputDescriptor.name})`,
        HttpStatus.FORBIDDEN
      );
    }
    for (const fieldDescriptor of inputDescriptor.constraints.fields ?? []) {
      validateField(fieldDescriptor, queryResult[0]);
    }
  }
  return plainToInstance(VerifiablePresentation, vpJson);
}
