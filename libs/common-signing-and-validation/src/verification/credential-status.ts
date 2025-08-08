import { Bitstring } from "@digitalbazaar/bitstring";
import { HttpStatus, Logger } from "@nestjs/common";
import { AppError, parseNetworkError, toArray } from "@tsg-dsp/common-api";
import { BitstringStatusList, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { VerifiedCredentialStatus } from "@tsg-dsp/common-dtos";
import axios from "axios";
import { plainToInstance } from "class-transformer";

import { TrustAnchor } from "../model.js";
import { base58btcToBase64url } from "../utils/typeconverter.js";
import { verifyCredentialValidity } from "./credential-validity.js";

interface CacheEntry {
  time: number;
  context: VerifiableCredential<BitstringStatusList>;
}

export const cachedStatusCredentials = new Map<string, CacheEntry>();

export async function getStatusCredential(
  statusListCredential: string,
  disableCache: boolean = false
): Promise<VerifiableCredential<BitstringStatusList>> {
  const cacheEntry = cachedStatusCredentials.get(statusListCredential);
  if (!disableCache && cacheEntry) {
    if (cacheEntry.time + 24 * 60 * 60 * 1000 > new Date().getTime()) {
      return cacheEntry.context;
    }
  }
  try {
    const response =
      await axios.get<VerifiableCredential<BitstringStatusList>>(
        statusListCredential
      );
    const parsedCredential = plainToInstance(
      VerifiableCredential<BitstringStatusList>,
      response.data
    );

    cachedStatusCredentials.set(statusListCredential, {
      time: new Date().getTime(),
      context: parsedCredential
    });
    return parsedCredential;
  } catch (error) {
    throw parseNetworkError(
      error,
      `fetching StatusListCredential ${statusListCredential}`
    ).andLog(new Logger("CredentialStatus"), "debug");
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
    ).andLog(new Logger("CredentialStatus"), "debug");
  }
  return await verifyBitstringStatus(
    toArray(credential.credentialSubject)[0],
    statusListCredential,
    position
  );
}

export async function verifyBitstringStatus(
  bitstringStatusList: BitstringStatusList,
  statusListCredential: string,
  position: string
): Promise<VerifiedCredentialStatus> {
  try {
    let encodedList = bitstringStatusList.encodedList;
    if (encodedList.startsWith("z")) {
      encodedList = base58btcToBase64url(encodedList);
    } else {
      encodedList = encodedList.slice(1);
    }
    const buffer = await Bitstring.decodeBits({ encoded: encodedList });
    const bitstring = new Bitstring({ buffer });
    return plainToInstance(VerifiedCredentialStatus, {
      statusListCredential: statusListCredential,
      statusListIndex: position,
      statusPurpose: bitstringStatusList.statusPurpose,
      status: bitstring.get(parseInt(position))
    });
  } catch (error) {
    throw new AppError(
      `Could not verify position ${position} in StatusListCredential ${statusListCredential}`,
      HttpStatus.BAD_REQUEST,
      error
    ).andLog(new Logger("CredentialStatus"), "debug");
  }
}
