import crypto from "crypto";
import { SignJWT } from "jose";
import { IamConfig } from "../../config";
import { WalletClient } from "./walletClient";
import { VerifiablePresentationJwt } from "@tsg-dsp/common";
import { plainToInstance } from "class-transformer";

export class DevWalletClient extends WalletClient {
  constructor(private readonly iamConfig: IamConfig) {
    super();
  }
  async requestVerifiablePresentation(
    audience: string
  ): Promise<VerifiablePresentationJwt> {
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
      iat: Date.now(),
      iss: "did:web:wallet-catena-x.alpha.scsn.dataspac.es",
      sub: this.iamConfig.didId,
      aud: audience,
      exp: Date.now() + 60 * 60 * 24 * 1000,
      jti: "5a06004e-2d39-4ccd-a0c4-cf8d36a287be",
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

    return plainToInstance(VerifiablePresentationJwt, { vp: jwt });
  }

  async requestValidation(
    jwt: VerifiablePresentationJwt,
    audience: string
  ): Promise<boolean> {
    return true;
  }
}
