import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AppError,
  EmailService,
  Paginated,
  PaginationOptionsDto,
  TemplateParameters
} from "@tsg-dsp/common-api";
import { CredentialSubject } from "@tsg-dsp/common-dsp";
import {
  CredentialOffer,
  CredentialOfferRequest,
  CredentialOfferStatus,
  DCPCredentialRequestInitiation,
  OfferGrants,
  OID4VCICredentialRequestInitiation
} from "@tsg-dsp/wallet-dtos";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { CredentialsDto } from "../credentials/credentials.schemas.js";
import { IssueConfigurationService } from "../issue-configurations/issue-configuration.service.js";
import { CredentialIssuance } from "../model/issuance.dao.js";
import { DCPHolderService } from "./dcp/holder.service.js";
import { OID4VCIHolderService } from "./oid4vci/holder.service.js";

@Injectable()
export class IssuanceService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(CredentialIssuance)
    private readonly issuanceRepository: Repository<CredentialIssuance>,
    private readonly issueConfigurationService: IssueConfigurationService,
    private readonly emailService: EmailService,
    private readonly dcpHolderService: DCPHolderService,
    private readonly oid4VCIHolderService: OID4VCIHolderService
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);
  initialized: Promise<boolean>;

  async init() {
    this.logger.log("Initializing IssuanceService");
    const existingOffers = await this.issuanceRepository.find({});
    await Promise.allSettled(
      this.config.issuance.issuer.map(async (issuerConfig) => {
        if (
          existingOffers.find(
            (o) =>
              o.holderId === issuerConfig.holderId &&
              o.credentialType === issuerConfig.credentialType &&
              (!issuerConfig.preAuthorizedCode ||
                o.preAuthorizedCode === issuerConfig.preAuthorizedCode)
          )
        ) {
          this.logger.log(
            `Already created offer for ${issuerConfig.holderId} for ${issuerConfig.credentialType} credential`
          );
        } else {
          try {
            const offer = await this.createCredentialOffer(issuerConfig);
            this.logger.log(
              `Created initial credential offer for ${issuerConfig.holderId} for ${
                issuerConfig.credentialType
              } credential with pre authorization code ${
                offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
                  "pre-authorized_code"
                ]
              }`
            );
          } catch (err) {
            this.logger.error(
              `Could not create credential offer for ${issuerConfig.holderId} for ${issuerConfig.credentialType} credential: ${err}`
            );
          }
        }
      })
    );

    return true;
  }

  async credentialOfferStatus(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CredentialOfferStatus[]>> {
    const [offers, total] = await this.issuanceRepository.findAndCount({
      ...paginationOptions.typeOrm,
      select: [
        "id",
        "createdDate",
        "preAuthorizedCode",
        "holderId",
        "credentialType",
        "credentialId",
        "revoked",
        "credentialSubject",
        "remoteId"
      ]
    });

    return {
      total: total,
      data: offers
    };
  }

  private async issuanceById(id: string): Promise<CredentialIssuance> {
    const issuance = await this.issuanceRepository.findOneBy({ id });
    if (!issuance) {
      throw new AppError(
        `No credential issuance flow found for id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    return issuance;
  }

  async credentialOfferById(
    identifier: string
  ): Promise<CredentialOfferStatus> {
    const issuance = await this.issuanceById(identifier);
    return new CredentialOfferStatus(issuance);
  }

  async addDefaultClaims(
    credentialSubject: CredentialSubject,
    credentialType: string
  ): Promise<CredentialSubject> {
    const issuerConfig =
      await this.issueConfigurationService.getIssueConfigurationByType(
        credentialType
      );
    if (!issuerConfig) {
      this.logger.warn(
        `Issuer configuration with credential type ${credentialType} not found`
      );
      return credentialSubject;
    }
    const schema = issuerConfig.schema;
    if (!schema) {
      this.logger.warn(
        `Schema for credential type ${credentialType} not found`
      );
      return credentialSubject;
    }
    const requiredClaims = schema.required;
    requiredClaims.forEach((claim: string) => {
      if (!credentialSubject[claim]) {
        credentialSubject[claim] = schema.properties[claim].default;
      }
    });

    return credentialSubject;
  }

  async createCredentialOffer(
    offerRequest: CredentialOfferRequest,
    mobile?: boolean
  ): Promise<CredentialOffer> {
    const code =
      offerRequest.preAuthorizedCode || randomBytes(48).toString("hex");

    let credentialSubject: CredentialSubject;
    if (mobile) {
      credentialSubject = await this.addDefaultClaims(
        offerRequest.credentialSubject,
        offerRequest.credentialType
      );
    } else {
      credentialSubject = offerRequest.credentialSubject;
    }
    const offer = await this.issuanceRepository.save({
      preAuthorizedCode: code,
      holderId: offerRequest.holderId,
      credentialType: offerRequest.credentialType,
      revoked: false,
      credentialSubject: credentialSubject
    });

    if (credentialSubject.email && this.config.email.enabled) {
      const emailParameters: TemplateParameters = {
        email: credentialSubject.email,
        sender: `"${this.config.runtime.title} Wallet" <noreply@dataspac.es>`,
        title: `${this.config.runtime.title} - Retrieve your credential`,
        summary: `Retrieve your credential for ${this.config.runtime.title}`,
        link: `${this.config.server.publicAddress}`,
        img: `${this.config.server.publicAddress}/layout/images/logo-dark.svg`,
        header: `Retrieve your credential`,
        content: [
          {
            paragraphs: [
              `You have been offered a credential for ${this.config.runtime.title}.`,
              `Please click the link below to retrieve your credential.`
            ]
          },
          {
            button: {
              url: `${this.config.server.publicAddress}/#/retrieve-credential/${offer.id}?mobile=${mobile ?? true}`,
              text: "Retrieve Credential"
            }
          }
        ],
        footer: `This email was sent to ${credentialSubject.email} because you asked for a credential for ${this.config.runtime.title}. If you did not expect this email, please ignore it.`
      };
      this.emailService.sendMail(emailParameters);
    }

    return {
      credential_issuer: `https://${this.config.server.publicDomain}`,
      credential_configuration_ids: [offerRequest.credentialType],
      grants: {
        [OfferGrants.PRE_AUTHORIZED_CODE]: {
          "pre-authorized_code": code
        }
      }
    };
  }

  async revokeOffer(id: string): Promise<CredentialOfferStatus> {
    const issuance = await this.issuanceById(id);
    await this.issuanceRepository.update({ id: id }, { revoked: true });
    return {
      id: issuance.id,
      createdDate: issuance.createdDate,
      preAuthorizedCode: issuance.preAuthorizedCode,
      holderId: issuance.holderId,
      credentialType: issuance.credentialType,
      credentialId: issuance.credentialId,
      revoked: true,
      credentialSubject: issuance.credentialSubject
    };
  }

  async requestDCPCredential(
    request: DCPCredentialRequestInitiation
  ): Promise<void> {
    return await this.dcpHolderService.requestCredential(request);
  }
  async requestOID4VCICredential(
    request: OID4VCICredentialRequestInitiation
  ): Promise<CredentialsDto[]> {
    return await this.oid4VCIHolderService.requestCredential(request);
  }
}
