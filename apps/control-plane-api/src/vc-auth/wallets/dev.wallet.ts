import { HttpStatus } from "@nestjs/common";
import { CredentialContainer, formatPresentation } from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { SignJWT } from "jose";

import { DevWalletConfig } from "../../config.js";
import { DSPError } from "../../utils/errors/error.js";
import { Credential, WalletClient } from "./walletClient.js";

export class DevWalletClient extends WalletClient {
  constructor(private readonly iamConfig: DevWalletConfig) {
    super();
  }
  async requestVerifiablePresentation(audience: string): Promise<string> {
    const vp = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://w3c.github.io/vc-jws-2020/contexts/v1/"
      ],
      type: ["VerifiablePresentation"],
      verifiableCredential: {
        "@context": [
          "https://www.w3.org/ns/credentials/v2",
          "https://w3c.github.io/vc-jws-2020/contexts/v1/",
          "https://wallet.alpha.scsn.dataspac.es/context/SCSN"
        ],
        type: ["VerifiableCredential", "SCSNCredential"],
        id: `${this.iamConfig.didId}#90277481-89fc-47c1-9fcb-7abbbe5aac6e`,
        issuer: "did:web:wallet.alpha.scsn.dataspac.es",
        validFrom: "2023-08-30T15:08:39.340Z",
        validUntil: "2023-11-30T15:08:39.340Z",
        credentialSubject: {
          id: `${this.iamConfig.didId}`,
          scsnIdentifier: "urn:scsn:23456789012345",
          scsnRole: "scsn:ServiceProvider"
        },
        proof: {
          type: "DataIntegrityProof",
          created: "2024-07-30T13:51:30.581Z",
          proofPurpose: "assertionMethod",
          verificationMethod: "did:web:dataspace-authority.example.com#key-0",
          cryptosuite: "eddsa-jcs-2022",
          proofValue:
            "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe"
        }
      }
    };
    const jwt = await new SignJWT({ vp: vp })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(this.iamConfig.didId)
      .setSubject(this.iamConfig.didId)
      .setAudience(audience)
      .setExpirationTime("24h")
      .setJti(crypto.randomUUID())
      .sign(new TextEncoder().encode("ThisIsTheMostSecretKeyYouHaveEverSeen"));

    return jwt;
  }

  async requestValidation(
    token: string,
    _audience: string
  ): Promise<CredentialContainer[] | undefined> {
    // const tokenPayload = decode(token, { json: true });
    return formatPresentation(token);
    // return [plainToInstance(VerifiablePresentation, tokenPayload!["vp"])];
  }

  async getCredentials(): Promise<Credential[]> {
    return [];
  }

  async requestSignature(_document: Record<string, any>): Promise<any> {
    throw new DSPError(
      `Dev Wallet does not support signing of documents`,
      HttpStatus.NOT_IMPLEMENTED
    );
  }
  async requestSignatureValidation(
    _signedDocument: Record<string, any>
  ): Promise<any> {
    throw new DSPError(
      `Dev Wallet does not support validation of documents`,
      HttpStatus.NOT_IMPLEMENTED
    );
  }
}
