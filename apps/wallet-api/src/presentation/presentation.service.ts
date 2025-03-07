import { Injectable, Logger } from "@nestjs/common";
import {
  PresentationValidation,
  Proof,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import {
  PresentationDefinition,
  PresentationResponse
} from "@tsg-dsp/common-dtos";
import {
  evaluatePresentationResponseValidity,
  verifyCredentialStatusValidity,
  verifyCredentialValidity,
  verifyPresentationValidity
} from "@tsg-dsp/common-signing-and-validation";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";

import { RootConfig, SignatureType } from "../config.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import { SignatureService } from "../keys/signature.service.js";

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
    credentialId: string,
    unwrap: boolean
  ): Promise<VerifiablePresentationJsonLd> {
    const credential =
      await this.credentialsService.getCredential(credentialId);
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      id: `${await this.didService.getDidId()}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? credential.credential
        : [credential.credential]
    };

    let proof: Proof;
    if (
      this.config.signature.credentials === SignatureType.DATA_INTEGRITY_PROOF
    ) {
      verifiablePresentation["@context"].push(
        "https://w3id.org/security/data-integrity/v2"
      );
      proof = await this.signatureService.signAsDataIntegrityProof(
        "RDFC",
        verifiablePresentation
      );
    } else {
      verifiablePresentation["@context"].push(
        "https://w3id.org/security/suites/jws-2020/v1"
      );
      proof = await this.signatureService.signAsJsonWebSignature2020(
        verifiablePresentation
      );
    }
    verifiablePresentation.proof = proof;
    return plainToInstance(VerifiablePresentationJsonLd, {
      vp: verifiablePresentation
    });
  }

  async createVerifiablePresentationJwt(
    credentials: string | VerifiableCredential[],
    audience: string,
    unwrap: boolean
  ): Promise<VerifiablePresentationJwt> {
    let vcs: VerifiableCredential[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential =
        await this.credentialsService.getCredential(credentials);
      vcs = [credential.credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap ? vcs[0] : vcs
    };
    return plainToInstance(VerifiablePresentationJwt, {
      vp: await this.signatureService.signAsJwt(
        { vp: verifiablePresentation },
        audience,
        {
          expirationTime: "24h"
        }
      )
    });
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
    definition: PresentationDefinition,
    response: PresentationResponse
  ): Promise<VerifiablePresentation> {
    this.logger.log(`Evaluating presentation response`);
    this.logger.debug(`VP token: ${response.vp_token}`);
    this.logger.debug(`Definition: ${JSON.stringify(definition)}`);
    this.logger.debug(`Response: ${JSON.stringify(response)}`);
    return await evaluatePresentationResponseValidity(
      definition,
      response,
      this.config?.trustAnchors ? this.config.trustAnchors : []
    );
  }
}
