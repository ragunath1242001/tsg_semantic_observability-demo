import { plainToInstance } from "class-transformer";

import {
  Credential,
  CredentialContainer,
  EnvelopedVerifiableCredential,
  isEnvelopedVerifiableCredential,
  VerifiableCredential
} from "../model/ssi/credentials.dto.js";
import {
  EnvelopedVerifiablePresentation,
  isEnvelopedVerifiablePresentation,
  VerifiablePresentation
} from "../model/ssi/presentations.dto.js";
import { OrArray, toArray } from "./unions.js";

export function formatPresentation(
  presentation:
    | VerifiablePresentation
    | EnvelopedVerifiablePresentation
    | string
): CredentialContainer[] {
  if (typeof presentation === "string") {
    const payload = JSON.parse(
      Buffer.from(presentation.split(".")[1], "base64url").toString("utf8")
    );
    let jwtPayload: any;
    if ("vp" in payload) {
      jwtPayload = payload.vp;
    } else {
      jwtPayload = payload;
    }
    if (jwtPayload.type) {
      if (toArray(jwtPayload.type).includes("VerifiablePresentation")) {
        return formatPresentation(
          plainToInstance(VerifiablePresentation, jwtPayload)
        );
      } else if (
        toArray(jwtPayload.type).includes("EnvelopedVerifiablePresentation")
      ) {
        return formatPresentation(
          plainToInstance(EnvelopedVerifiablePresentation, jwtPayload)
        );
      }
    }

    throw new Error(
      `Unparseable presentation: ${JSON.stringify(presentation)}`
    );
  } else if (isEnvelopedVerifiablePresentation(presentation)) {
    const jwt = presentation.id.replace("data:application/vp+jwt,", "");
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")
    );
    return formatPresentation(plainToInstance(VerifiablePresentation, payload));
  } else {
    return toArray(presentation.verifiableCredential).map(formatCredential);
  }
}

export function formatCredential(
  credential: VerifiableCredential | EnvelopedVerifiableCredential | string
): CredentialContainer {
  if (typeof credential === "string") {
    const payload = JSON.parse(
      Buffer.from(credential.split(".")[1], "base64url").toString("utf8")
    );
    let credentialParsed: Credential;
    if ("vc" in payload) {
      credentialParsed = plainToInstance(Credential, payload.vc);
    } else {
      credentialParsed = plainToInstance(Credential, payload);
    }
    return plainToInstance(CredentialContainer, {
      credential: credentialParsed,
      jwt: credential
    });
  } else if (isEnvelopedVerifiableCredential(credential)) {
    const jwt = credential.id.replace("data:application/vc+jwt,", "");
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")
    );
    return plainToInstance(CredentialContainer, {
      credential: plainToInstance(Credential, payload),
      jwt: jwt
    });
  } else {
    const { proof, ...credentialRemainder } = credential;
    return plainToInstance(CredentialContainer, {
      credential: credentialRemainder,
      proof
    });
  }
}

export function formatCredentials(
  credential: OrArray<
    VerifiableCredential | EnvelopedVerifiableCredential | string
  >
): CredentialContainer[] {
  if (!Array.isArray(credential)) {
    return [formatCredential(credential)];
  }
  return credential.map((c) => formatCredential(c));
}
