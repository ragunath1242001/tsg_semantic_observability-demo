import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CredentialsService } from "../credentials/credentials.service.js";
import { InitCredentialConfig, RootConfig } from "../config.js";
import { AccessToken, CredentialIssuerMetadata, CredentialOffer, CredentialOfferRequest, CredentialRequest, CredentialResponse, OfferGrants } from "../model/issuance.dto.js";
import crypto from 'crypto';
import { AppError } from "../utils/error.js";
import { plainToInstance } from "class-transformer";
import { PresentationService } from "../presentation/presentation.service.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";

@Injectable()
export class IssuerService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(CredentialIssuance) private readonly issuanceRepository: Repository<CredentialIssuance>,
    @InjectRepository(CIAccessToken) private readonly tokenRepository: Repository<CIAccessToken>,
    private readonly credentialService: CredentialsService,
    private readonly presentationService: PresentationService,
    private readonly didResolverService: DidResolverService) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  initialized: Promise<boolean>;
  async init() {
    this.logger.log('Initializing IssuanceService');
    const existingOffers = await this.issuanceRepository.find({});
    await Promise.all(this.config.oid4vci.issuer.map(async issuerConfig => {
      if (existingOffers.find(o => 
          o.holderId === issuerConfig.holderId && 
          o.credentialType === issuerConfig.credentialType && 
          (!issuerConfig.preAuthorizationCode || o.preAuthorizedCode === issuerConfig.preAuthorizationCode)
      )) {
        this.logger.log(`Already created offer for ${issuerConfig.holderId} for ${issuerConfig.credentialType} credential`);
      } else {
        await this.createCredentialOfferWithRetry({
          holderId: issuerConfig.holderId,
          credentialType: issuerConfig.credentialType,
          credentialSubject: issuerConfig.credentialSubject,
          preAuthorizedCode: issuerConfig.preAuthorizationCode
        });
      }
    }));

    return true;
  }

  async createCredentialOfferWithRetry(offerRequest: CredentialOfferRequest, retry = 0) {
    try {
      const offer = await this.createCredentialOffer(offerRequest);
      this.logger.log(`Created credential offer for ${offerRequest.holderId} for ${offerRequest.credentialType} credential with pre authorization code ${offer.grants?.[OfferGrants.PRE_AUTHORIZATION_CODE]?.["pre-authorization_code"]}`)
    } catch(err) {
      if (retry < 5) {
        this.logger.warn(`Could not create credential offer for ${offerRequest.holderId} for ${offerRequest.credentialType} credential`);
        this.logger.log(`Error: ${err}`);
        await new Promise(f => setTimeout(f, 10000));
        await this.createCredentialOfferWithRetry(offerRequest, ++retry);
      } else {
        this.logger.error(`Could not create credential offer for ${offerRequest.holderId} for ${offerRequest.credentialType} credential: ${err}`);
        throw err;
      }
    }
  }

  async issuerMetadata(): Promise<CredentialIssuerMetadata> {
    const issuerMetadata: CredentialIssuerMetadata = {
      credential_issuer: this.config.server.publicAddress,
      credential_endpoint: `${this.config.server.publicAddress}/oid4vci/credential`,
      token_endpoint: `${this.config.server.publicAddress}/oid4vci/token`,
      credential_configurations_supported: {}
    }
    this.config.contexts.filter(c => c.issuable).forEach(context => {
      issuerMetadata.credential_configurations_supported[context.credentialType] = {
        format: 'ldp_vc',
        '@context': ["https://www.w3.org/2018/credentials/v1", "https://w3c.github.io/vc-jws-2020/contexts/v1/", context.documentUrl ?? context?.documentUrl ?? `${this.config.server.publicAddress}/context/${context?.id}`],
        cryptographic_binding_methods_supported: [
          'did:web'
        ],
        credential_signing_alg_values_supported: [
          'EdDSA', 'ES384', 'PS256'
        ],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: [
              'EdDSA', 'ES384', 'PS256'
            ]
          }
        },
        credential_definition: {
          type: ['VerifiableCredential', context.credentialType],
          '@context': ["https://www.w3.org/2018/credentials/v1", "https://w3c.github.io/vc-jws-2020/contexts/v1/", context.documentUrl ?? context?.documentUrl ?? `${this.config.server.publicAddress}/context/${context?.id}`]
        }
      }
    });
    return issuerMetadata;
  }


  async createCredentialOffer(offerRequest: CredentialOfferRequest): Promise<CredentialOffer> {
    const code = offerRequest.preAuthorizedCode || crypto.randomBytes(48).toString('hex');

    await this.issuanceRepository.save({
      preAuthorizedCode: code,
      holderId: offerRequest.holderId,
      credentialType: offerRequest.credentialType,
      credentialSubject: offerRequest.credentialSubject
    });

    return {
      credential_issuer: this.config.server.publicAddress,
      credential_configuration_ids: [offerRequest.credentialType],
      grants: {
        [OfferGrants.PRE_AUTHORIZATION_CODE]: {
          "pre-authorization_code": code
        }
      }
    }
  }

  async createAccessToken(preAuthorizedCode: string): Promise<AccessToken> {
    const issuance = await this.issuanceRepository.findOneBy({preAuthorizedCode: preAuthorizedCode});
    if (!issuance) {
      throw new AppError('No credential issuance flow found', HttpStatus.NOT_FOUND).andLog(this.logger);
    }
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds()+86400);
    const token = await this.tokenRepository.save({
      access_token: crypto.randomBytes(48).toString('hex'),
      expires_at: expirationDate,
      refresh_token: crypto.randomBytes(48).toString('hex'),
      nonce: crypto.randomBytes(48).toString('hex'),
      issuance: issuance
    });
    return {
      access_token: token.access_token,
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: token.refresh_token,
      c_nonce: token.nonce,
      c_nonce_expires_in: 86400,
      authorization_details: [{
        type: "openid_credential",
        credential_configuration_id: issuance.credentialType,
        credential_identifiers: [issuance.credentialType]
      }]
    };
  }

  async handleCredentialRequest(access_token: string, credentialRequest: CredentialRequest): Promise<CredentialResponse> {
    try {
      const token = await this.tokenRepository.findOneBy({access_token: access_token});
      if (!token) {
        throw new AppError('Token not recognized', HttpStatus.UNAUTHORIZED);
      }
      const issuance = token.issuance;
      if (credentialRequest.proof.proof_type != "jwt") {
        throw new AppError('Only jwt proof types are supported at this moment', HttpStatus.BAD_REQUEST);
      }

      const holderDid = await this.didResolverService.resolve(issuance.holderId);
      const parsedJwtHeader = await decodeProtectedHeader(credentialRequest.proof.jwt);

      if (!parsedJwtHeader.kid) {
        throw new AppError('Only JWTs with "kid" referencing a key described in a DID document supported', HttpStatus.BAD_REQUEST);
      }

      const usedJwk = holderDid.verificationMethod?.find(m => m.id === parsedJwtHeader.kid);
      if (!usedJwk || !usedJwk.publicKeyJwk) {
        throw new AppError(`Could not find publicKeyJwk for ${parsedJwtHeader.kid} in DID document`, HttpStatus.BAD_REQUEST);
      }
      const key = await importJWK(usedJwk.publicKeyJwk);
      const verifiedJwt = await jwtVerify(credentialRequest.proof.jwt, key);
      
      if (verifiedJwt.payload.aud !== this.config.server.publicAddress) {
        throw new AppError(`Audience in proof JWT does not match credential_issuer (${verifiedJwt.payload.aud} vs ${this.config.server.publicAddress})`, HttpStatus.BAD_REQUEST);
      }

      if (verifiedJwt.payload.nonce !== token.nonce) {
        throw new AppError('Nonce in JWT proof doesn\'t match registered nonce', HttpStatus.BAD_REQUEST);
      }

      const context = this.config.contexts.find(context => context.credentialType === issuance.credentialType);

      if (!context) {
        throw new AppError(`Context for ${issuance.credentialType} not configured`, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const credentialConfig = plainToInstance(InitCredentialConfig, {
        context: [context?.documentUrl ?? `${this.config.server.publicAddress}/context/${context?.id}`],
        type: [issuance.credentialType],
        id: `${issuance.holderId}#${crypto.randomUUID()}`,
        credentialSubject: issuance.credentialSubject
      });
      const credential = await this.credentialService.issueCredential(credentialConfig, issuance.holderId);
      const credentialJwt = await this.presentationService.createVerifiablePresentationJwt(credential.id, token.issuance.holderId, true);
      return {
        credential: credentialJwt.vp
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error.andLog(this.logger);
      } else {
        throw new AppError(`${error}`, HttpStatus.INTERNAL_SERVER_ERROR).andLog(this.logger);
      }
    }
  }
}