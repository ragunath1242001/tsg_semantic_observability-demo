import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";
import { SignJWT } from "jose";
import { decode } from "jsonwebtoken";
import { DevWalletConfig } from "../../config";
import { Credential, WalletClient } from "./walletClient";

export class DevWalletClient extends WalletClient {
  constructor(private readonly iamConfig: DevWalletConfig) {
    super();
  }
  async requestVerifiablePresentation(audience: string): Promise<string> {
    const vp = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3c.github.io/vc-jws-2020/contexts/v1/",
      ],
      type: ["VerifiablePresentation"],
      verifiableCredential: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3c.github.io/vc-jws-2020/contexts/v1/",
          "https://wallet.alpha.scsn.dataspac.es/context/SCSN",
        ],
        type: ["VerifiableCredential", "SCSNCredential"],
        id: `${this.iamConfig.didId}#90277481-89fc-47c1-9fcb-7abbbe5aac6e`,
        issuer: "did:web:wallet.alpha.scsn.dataspac.es",
        issuanceDate: "2023-08-30T15:08:39.340Z",
        expirationDate: "2023-11-30T15:08:39.340Z",
        credentialSubject: {
          id: `${this.iamConfig.didId}`,
          scsnIdentifier: "urn:scsn:23456789012345",
          scsnRole: "scsn:ServiceProvider",
        },
        proof: {
          type: "JsonWebSignature2020",
          created: "2023-08-30T15:08:39.887Z",
          proofPurpose: "assertionMethod",
          jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..cd2eKQ0eCQJCkqLVmEHZ_pqW_mm5wkOIzaM1bB4FphIKSaIEJhEU4fHKHGmsdVFHpTdmgvQ4e52YofA00ujvAg",
          verificationMethod: "did:web:wallet.alpha.scsn.dataspac.es#key-0",
        },
      },
    };
    const jwt = await new SignJWT({ vp: vp })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("did:web:wallet-catena-x.alpha.scsn.dataspac.es")
      .setSubject(this.iamConfig.didId)
      .setAudience(audience)
      .setExpirationTime("24h")
      .setJti(crypto.randomUUID())
      .sign(new TextEncoder().encode("ThisIsTheMostSecretKeyYouHaveEverSeen"));

    return jwt;
  }

  async requestValidation(
    token: string,
    audience: string
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  > {
    const tokenPayload = decode(token, { json: true });
    return plainToInstance(VerifiablePresentation, tokenPayload!["vp"]);
  }

  async getCredentials(): Promise<Credential[]> {
    return [];
  }
}
