import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CredentialsService } from "../credentials/credentials.service.js";
import { InitCredentialConfig, RootConfig } from "../config.js";
import { AccessToken, CredentialOffer, CredentialRequest, CredentialResponse, OfferGrants } from "../model/issuance.dto.js";
import { CredentialSubject } from "@tsg-dsp/common";
import crypto from 'crypto';
import { AppError } from "../utils/error.js";
import { plainToInstance } from "class-transformer";
import { PresentationService } from "../presentation/presentation.service.js";

@Injectable()
export class IssuanceService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(CredentialIssuance) private readonly issuanceRepository: Repository<CredentialIssuance>,
    @InjectRepository(CIAccessToken) private readonly tokenRepository: Repository<CIAccessToken>,
    private readonly credentialService: CredentialsService,
    private readonly presentationService: PresentationService
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  initialized: Promise<boolean>;
  async init() {
    this.logger.log('Initializing IssuanceService');
    return true;
  }

  async createCredentialOffer(holderId: string, credentialType: string, credentialSubject: CredentialSubject, preAuthorizedCode?: string): Promise<CredentialOffer> {
    const code = preAuthorizedCode || crypto.randomBytes(48).toString('hex');

    await this.issuanceRepository.save({
      preAuthorizedCode: code,
      holderId: holderId,
      credentialType: credentialType,
      credentialSubject: credentialSubject
    });

    return {
      credential_issuer: this.config.server.publicAddress,
      credential_configuration_ids: [credentialType],
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
      throw new AppError('No credential issuance flow found', HttpStatus.NOT_FOUND);
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
      c_nonce_expires_in: 86400
    };
  }

  async handleCredentialRequest(access_token: string, credentialRequest: CredentialRequest): Promise<CredentialResponse> {
    const token = await this.tokenRepository.findOneBy({access_token: access_token});
    if (!token) {
      throw new AppError('Token not recognized', HttpStatus.UNAUTHORIZED);
    }
    const issuance = token.issuance;
    if (credentialRequest.proof.proof_type != "ldp_vp") {
      throw new AppError('Only ldp_vp proof types are supported at this moment', HttpStatus.BAD_REQUEST);
    }
    if (issuance.holderId != credentialRequest.proof.ldp_vp.holder) {
      throw new AppError('Mismatch of registered holder and holder in request', HttpStatus.BAD_REQUEST);
    }
    // TODO: Verify proof

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
  }
}