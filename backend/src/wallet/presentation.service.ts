import { Injectable, HttpStatus, Logger } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { SignJWT, importJWK, decodeJwt, jwtVerify, compactVerify } from "jose";
import { VerifiablePresentationJsonLd, VerifiablePresentation, VerifiableCredential, CredentialSubject, VerifiablePresentationJwt, PresentationValidation } from "../model/credentials.dto.js";
import { AppError } from "../utils/error.js";
import jsonld from "jsonld";
import crypto from "crypto";
import { CredentialsService, signingAlgorithm } from "./credentials.service.js";
import { KeyService } from "./keys.service.js";
import { DIDResolver } from "./didResolver.service.js";
import { RootConfig } from "../config.js";

@Injectable()
export class PresentationService {
  constructor(
    private readonly config: RootConfig,
    private readonly credentialsService: CredentialsService,
    private readonly keyService: KeyService,
    private readonly didResolver: DIDResolver,
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createVerifiablePresentationJsonLd(credentialId: string, unwrap: boolean): Promise<VerifiablePresentationJsonLd> {
    const credential = await this.credentialsService.getCredential(credentialId);
    const verifiablePresentation: VerifiablePresentation<VerifiableCredential<CredentialSubject>> = {
      '@context': ['https://www.w3.org/2018/credentials/v1', "https://w3c.github.io/vc-jws-2020/contexts/v1/"],
      '@type': ['VerifiablePresentation'],
      verifiableCredential: (unwrap) ? credential.credential : [
        credential.credential
      ],
    }
    
    return plainToClass(VerifiablePresentationJsonLd, {vp: verifiablePresentation})
  }

  async createVerifiablePresentationJwt(credentialId: string, audience: string, unwrap: boolean): Promise<VerifiablePresentationJwt> {
    const credential = await this.credentialsService.getCredential(credentialId);
    if (!credential) {
      throw new AppError(`Credential ${credentialId} can't be found`, HttpStatus.NOT_FOUND);
    }
    const keyId = credential.credential.proof.verificationMethod.split('#').slice(-1)[0];
    const key = await this.keyService.getKey(keyId);
    if (!key) {
      throw new AppError(`Key material with id ${keyId} for credential ${credential.credential.id} can't be loaded`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
    const verifiablePresentation: VerifiablePresentation<VerifiableCredential<CredentialSubject>> = {
      '@context': ['https://www.w3.org/2018/credentials/v1', "https://w3c.github.io/vc-jws-2020/contexts/v1/"],
      '@type': ['VerifiablePresentation'],
      verifiableCredential: (unwrap) ? credential.credential : [
        credential.credential
      ],
    }
    const jwt = await new SignJWT({vp: verifiablePresentation})
      .setProtectedHeader({alg: signingAlgorithm(key.type)})
      .setIssuedAt()
      .setIssuer(credential.credential.credentialSubject.id)
      .setSubject(credential.credential.issuer)
      .setAudience(audience)
      .setExpirationTime('24h')
      .setJti(crypto.randomUUID())
      .sign(await importJWK(key.privateKey))
    return plainToClass(VerifiablePresentationJwt, {vp: jwt})
  }

  async validatePresentation(vpJwt: VerifiablePresentationJwt, audience?: string): Promise<PresentationValidation> {
    const jwtPayload = decodeJwt(vpJwt.vp);
    const vp = plainToClass(VerifiablePresentation, jwtPayload.vp)
    const resolvedDid = await this.didResolver.resolve(jwtPayload.iss!)

    let validateJWTSignature = false;
    for (const verificationMethod of resolvedDid.verificationMethod || []) {
      if (verificationMethod.publicKeyJwk) {
        const publicKey = await importJWK(verificationMethod.publicKeyJwk);
        try {
          await jwtVerify(vpJwt.vp, publicKey, {});
          validateJWTSignature = true;
          break;
        } catch (err) {
          this.logger.debug(`Invalid JWT signature for key ${verificationMethod.id}`)
        }
      }
    }
    const validateAudience = (audience) ? jwtPayload.aud === audience : undefined;
    const validateJWTExpiryDate = (jwtPayload.exp) ? jwtPayload.exp > (new Date().getTime() / 1000) : false;

    const validateExpiryDate: Array<boolean | "undefined"> = []
    const validateCredentials: boolean[] = [];
    const validateTrustAnchors: boolean[] = [];
    let credentials: VerifiableCredential<CredentialSubject>[]
    if (vp.verifiableCredential instanceof Array) {
      credentials = vp.verifiableCredential;
    } else {
      credentials = [vp.verifiableCredential]
    }
    for (const credential of credentials) {
      try {
        const validExpirationDate = (credential.expirationDate) ? new Date(credential.expirationDate).getTime() > new Date().getTime() : "undefined";
        validateExpiryDate.push(validExpirationDate);
        const {proof, ...plainCredential} = credential;

        const resolvedIssuerDid = await this.didResolver.resolve(credential.issuer);

        const credentialTypes = this.config.trustAnchors.find(trustAnchor => trustAnchor.identifier === credential.issuer)?.credentialTypes || []
        const trustedCredential = credential.type.filter(t => t !== 'VerifiableCredential').every(type => credentialTypes.includes(type));

        const normalized = await jsonld.normalize(plainCredential, {
          algorithm: 'URDNA2015'
        });
        const hash = crypto.createHash('sha256').update(normalized).digest('hex');
        const jwsWithHash = proof.jws.replace('..',`.${hash}.`);
        const usedKey = resolvedIssuerDid.verificationMethod?.find(m => m.id === proof.verificationMethod);
        if (!usedKey || !usedKey.publicKeyJwk){
          this.logger.debug(`Error during validation of VP: key mismatch`);
          validateCredentials.push(false);
          validateTrustAnchors.push(trustedCredential);
          break;
        }
        
        await compactVerify(jwsWithHash, await importJWK(usedKey.publicKeyJwk));
        validateCredentials.push(true);
        validateTrustAnchors.push(trustedCredential);
      } catch (err) {
        this.logger.debug(`Error during validation of VP: ${err}`);
        validateCredentials.push(false);
        validateTrustAnchors.push(false);
        break;
      }
    }

    const valid = validateJWTSignature && ((validateAudience !== undefined) ? validateAudience : true) && validateJWTExpiryDate && validateCredentials.every(r => r) && validateExpiryDate.every(r => r === true)

    return {
      vp: vpJwt.vp,
      valid: valid,
      validateExpiryDate: validateExpiryDate,
      validateCredentials: validateCredentials,
      validateTrustAnchors: validateTrustAnchors,
      validateJWTSignature: validateJWTSignature,
      validateJWTExpiryDate: validateJWTExpiryDate,
      validateAudience: validateAudience,
    }
  }
}