import { Injectable, Logger } from "@nestjs/common";
import {
  EnvelopedVerifiableCredential,
  EnvelopedVerifiablePresentation,
  PresentationValidation,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import { DcqlQuery, OID4VPAuthorizationResponse } from "@tsg-dsp/common-dtos";
import {
  evaluatePresentationResponseValidity,
  verifyCredentialStatusValidity,
  verifyCredentialValidity,
  verifyPresentationValidity
} from "@tsg-dsp/common-signing-and-validation";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";

import { RootConfig } from "../config.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import { SignatureService } from "../keys/signature.service.js";
import { CredentialDao } from "../model/credentials.dao.js";

@Injectable()
export class PresentationService {
  constructor(
    private readonly config: RootConfig,
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly didService: DidService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createVerifiablePresentationJsonLd(
    credentials: string | CredentialDao[],
    unwrap: boolean
  ): Promise<VerifiablePresentationJsonLd> {
    let vcs: CredentialDao[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential =
        await this.credentialsService.getCredential(credentials);
      vcs = [credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? this.convertDaoToCredential(vcs[0])
        : vcs.map((c) => this.convertDaoToCredential(c))
    };
    const proof = await this.signatureService.signAsDataIntegrityProof(
      "RDFC",
      verifiablePresentation
    );
    verifiablePresentation.proof = proof;
    return plainToInstance(VerifiablePresentationJsonLd, {
      vp: verifiablePresentation
    });
  }

  private convertDaoToCredential(
    credentialDao: CredentialDao
  ): VerifiableCredential | EnvelopedVerifiableCredential {
    if (credentialDao.jwt) {
      return {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: `data:application/vc+jwt,${credentialDao.jwt}`,
        type: ["EnvelopedVerifiableCredential"]
      };
    } else {
      return plainToInstance(VerifiableCredential, {
        ...credentialDao.credential,
        proof: credentialDao.proof
      });
    }
  }

  async createVerifiablePresentationJwt(
    credentials: string | CredentialDao[],
    audience: string,
    unwrap: boolean,
    format: "vp+jwt" | "enveloped" | "jwt_vp" = "vp+jwt",
    nonce?: string
  ): Promise<VerifiablePresentationJwt> {
    let vcs: CredentialDao[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential =
        await this.credentialsService.getCredential(credentials);
      vcs = [credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? this.convertDaoToCredential(vcs[0])
        : vcs.map((c) => this.convertDaoToCredential(c))
    };
    let jwt: string;
    switch (format) {
      case "jwt_vp":
        jwt = await this.createJwtVerifiablePresentation(
          verifiablePresentation,
          audience,
          nonce
        );
        break;
      case "vp+jwt":
        jwt = await this.createVerifiablePresentationJose(
          verifiablePresentation,
          audience,
          nonce
        );
        break;
      case "enveloped":
        jwt = await this.createEnvelopedVerifiablePresentation(
          verifiablePresentation,
          audience,
          nonce
        );
        break;
    }
    return plainToInstance(VerifiablePresentationJwt, {
      vp: jwt
    });
  }

  // https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose
  private async createVerifiablePresentationJose(
    verifiablePresentation: VerifiablePresentation,
    audience: string,
    nonce?: string
  ): Promise<string> {
    return await this.signatureService.signContainerAsJwt(
      verifiablePresentation,
      {
        audience,
        iat: true,
        expiresIn: 24 * 60 * 60, // 24 hours
        iss: true,
        nonce,
        typ: "vp+jwt",
        cty: "vp"
      }
    );
  }

  // https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose
  private async createEnvelopedVerifiablePresentation(
    verifiablePresentation: VerifiablePresentation,
    audience: string,
    nonce?: string
  ): Promise<string> {
    const vpJwt = await this.createVerifiablePresentationJose(
      verifiablePresentation,
      audience
    );
    const envelopedVerifiablePresentation: EnvelopedVerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      id: `data:application/vp+jwt,${vpJwt}`,
      type: ["EnvelopedVerifiablePresentation"]
    };
    return await this.signatureService.signContainerAsJwt(
      envelopedVerifiablePresentation,
      {
        audience,
        iat: true,
        expiresIn: 24 * 60 * 60, // 24 hours
        iss: true,
        nonce,
        typ: "vp+jwt",
        cty: "vp"
      }
    );
  }

  // https://identity.foundation/jwt-vc-presentation-profile/
  private async createJwtVerifiablePresentation(
    verifiablePresentation: VerifiablePresentation,
    audience: string,
    nonce?: string
  ): Promise<string> {
    return await this.signatureService.signAsJwt(
      { vp: verifiablePresentation, nonce },
      audience,
      {
        expirationTime: 24 * 60 * 60, // 24 hours
        jti: crypto.randomUUID()
      }
    );
  }

  async validatePresentation(
    vpJwt: VerifiablePresentationJwt,
    audience?: string
  ): Promise<PresentationValidation> {
    return verifyPresentationValidity(
      vpJwt,
      this.config?.trustAnchors ? this.config.trustAnchors : [],
      audience
    );
  }

  async validateCredential(credential: VerifiableCredential): Promise<{
    validExpiryDate: boolean;
    validTrustAnchors: boolean;
    validProof: boolean;
    validStatus: boolean;
  }> {
    return await verifyCredentialValidity(
      credential,
      this.config?.trustAnchors ? this.config.trustAnchors : []
    );
  }

  async verifyCredentialStatus(
    statusListCredential: string,
    position: string,
    disableCache: boolean = false
  ) {
    return await verifyCredentialStatusValidity(
      statusListCredential,
      position,
      disableCache,
      this.config?.trustAnchors ? this.config.trustAnchors : []
    );
  }

  public async evaluatePresentationResponse(
    dcqlQuery: DcqlQuery,
    response: OID4VPAuthorizationResponse,
    audience?: string,
    nonce?: string
  ): Promise<VerifiablePresentation[]> {
    this.logger.log(`Evaluating presentation response`);
    this.logger.debug(`VP token: ${response.vp_token}`);
    this.logger.debug(`DCQL Query: ${JSON.stringify(dcqlQuery)}`);
    this.logger.debug(`Response: ${JSON.stringify(response)}`);
    return await evaluatePresentationResponseValidity(
      dcqlQuery,
      response,
      this.config?.trustAnchors ? this.config.trustAnchors : [],
      audience,
      nonce
    );
  }
}
