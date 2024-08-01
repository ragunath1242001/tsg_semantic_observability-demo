import { plainToInstance } from "class-transformer";
import { decodeJwt } from "jose";
import {
  VerifiablePresentationJsonLd,
  VerifiablePresentation,
  VerifiableCredential,
  CredentialSubject,
  VerifiablePresentationJwt,
  PresentationValidation,
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { RootConfig } from "../config.js";
import { DidService } from "../did/did.service.js";
import { Injectable, Logger } from "@nestjs/common";
import { toArray } from "../utils/unions.js";
import { SignatureService } from "../keys/signature.service.js";

@Injectable()
export class PresentationService {
  constructor(
    private readonly config: RootConfig,
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly didResolver: DidResolverService,
    private readonly didService: DidService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createVerifiablePresentationJsonLd(
    credentialId: string,
    unwrap: boolean
  ): Promise<VerifiablePresentationJsonLd> {
    const credential = await this.credentialsService.getCredential(
      credentialId
    );
    const verifiablePresentation: VerifiablePresentation<
      VerifiableCredential<CredentialSubject>
    > = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3c.github.io/vc-jws-2020/contexts/v1/",
      ],
      type: ["VerifiablePresentation"],
      id: `${await this.didService.getDidId()}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? credential.credential
        : [credential.credential],
    };

    return plainToInstance(VerifiablePresentationJsonLd, {
      vp: verifiablePresentation,
    });
  }

  async createVerifiablePresentationJwt(
    credentials: string | VerifiableCredential<CredentialSubject>[],
    audience: string,
    unwrap: boolean
  ): Promise<VerifiablePresentationJwt> {
    let vcs: VerifiableCredential<CredentialSubject>[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential = await this.credentialsService.getCredential(
        credentials
      );
      vcs = [credential.credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation<
      VerifiableCredential<CredentialSubject>
    > = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3c.github.io/vc-jws-2020/contexts/v1/",
      ],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap ? vcs[0] : vcs,
    };
    return plainToInstance(VerifiablePresentationJwt, {
      vp: await this.signatureService.signJwt(
        { vp: verifiablePresentation },
        audience,
        {
          expirationTime: "24h",
        }
      ),
    });
  }

  async validatePresentation(
    vpJwt: VerifiablePresentationJwt,
    audience?: string
  ): Promise<PresentationValidation> {
    const jwtPayload = decodeJwt(vpJwt.vp);
    const vp = plainToInstance(VerifiablePresentation, jwtPayload.vp);
    const resolvedDid = await this.didResolver.resolve(jwtPayload.iss!);

    let validateJWTSignature;
    try {
      await this.signatureService.validateJwt(vpJwt.vp);
      validateJWTSignature = true;
    } catch (e) {
      validateJWTSignature = false;
    }

    const validateAudience = audience ? jwtPayload.aud === audience : undefined;
    const validateJWTExpiryDate = jwtPayload.exp
      ? jwtPayload.exp > new Date().getTime() / 1000
      : false;

    const validateExpiryDate: Array<boolean | "undefined"> = [];
    const validateCredentials: boolean[] = [];
    const validateTrustAnchors: boolean[] = [];
    for (const credential of toArray(vp.verifiableCredential)) {
      let validExpiryDate: boolean | "undefined" = false;
      let validTrustAnchor = false;
      let validCredential = false;
      try {
        validExpiryDate = credential.expirationDate
          ? new Date(credential.expirationDate).getTime() > new Date().getTime()
          : "undefined";

        const credentialTypes =
          this.config.trustAnchors.find(
            (trustAnchor) => trustAnchor.identifier === credential.issuer
          )?.credentialTypes || [];
        validTrustAnchor = credential.type
          .filter((t) => t !== "VerifiableCredential")
          .every((type) => credentialTypes.includes(type));

        const { proof, ...plainCredential } = credential;
        try {
          await this.signatureService.validateJsonWebSignature(
            plainCredential,
            proof
          );
          validCredential = true;
        } catch (e) {}
      } finally {
        validateExpiryDate.push(validExpiryDate);
        validateTrustAnchors.push(validTrustAnchor);
        validateCredentials.push(validCredential);
      }
    }

    const valid =
      validateJWTSignature &&
      (validateAudience !== undefined ? validateAudience : true) &&
      validateJWTExpiryDate &&
      validateCredentials.every((r) => r) &&
      validateExpiryDate.every((r) => r === true);

    return {
      vp: vpJwt.vp,
      valid: valid,
      validateExpiryDate: validateExpiryDate,
      validateCredentials: validateCredentials,
      validateTrustAnchors: validateTrustAnchors,
      validateJWTSignature: validateJWTSignature,
      validateJWTExpiryDate: validateJWTExpiryDate,
      validateAudience: validateAudience,
    };
  }
}
