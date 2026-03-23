import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AppError,
  parseNetworkError,
  ProtocolAuditService
} from "@tsg-dsp/common-api";
import {
  Action,
  CredentialMessage,
  CredentialRequestMessage,
  CredentialStatus,
  IssuerMetadata,
  Resource
} from "@tsg-dsp/common-dtos";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";
import { IsNull, Not, Repository } from "typeorm";

import { InitCredentialConfig, RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { IssueConfigurationService } from "../../issue-configurations/issue-configuration.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import { CredentialIssuance } from "../../model/issuance.dao.js";
import { API_PREFIX } from "../../utils/api-prefix.js";

@Injectable()
export class DCPIssuerService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(CredentialIssuance)
    private readonly issuanceRepository: Repository<CredentialIssuance>,
    private readonly didService: DidService,
    private readonly secureTokenService: SecureTokenService,
    private readonly issueConfigurationService: IssueConfigurationService,
    private readonly credentialService: CredentialsService,
    private readonly protocolAuditService: ProtocolAuditService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async issuerMetadata(): Promise<IssuerMetadata> {
    const didId = await this.didService.getDidId();
    const issueConfigs =
      await this.issueConfigurationService.getIssueConfigurations();
    const metadata: IssuerMetadata = {
      "@context": [
        "https://w3id.org/dspace-dcp/v1.0/dcp.jsonld",
        ...issueConfigs.map(
          (issueConfig) =>
            issueConfig.documentUrl ??
            `${this.config.server.publicAddress}${API_PREFIX}/issue-configuration/${issueConfig.id}`
        )
      ],
      type: "IssuerMetadata",
      issuer: didId,
      credentialsSupported: issueConfigs.map((issueConfig) => {
        if (issueConfig.proofType === "jwt") {
          return {
            id: `${didId}#${issueConfig.id}`,
            type: "CredentialObject",
            credentialType: issueConfig.credentialType,
            offerReason: "reissue",
            bindingMethods: ["did:web", "did:key", "did:tdw"],
            profile: "vc20-bssl/jwt"
          };
        } else {
          return {
            id: `${didId}#${issueConfig.id}`,
            type: "CredentialObject",
            credentialType: issueConfig.credentialType,
            offerReason: "reissue",
            bindingMethods: ["did:web", "did:key", "did:tdw"],
            profile: "vc20-bssl/ldp"
          };
        }
      })
    };
    return metadata;
  }

  async handleCredentialRequest(
    authorizationHeader: string | undefined,
    credentialRequestMessage: CredentialRequestMessage
  ) {
    const didId = await this.didService.getDidId();
    if (!authorizationHeader?.startsWith("Bearer ")) {
      await this.protocolAuditService.logDenied({
        caller:
          this.protocolAuditService.createUnknownServiceActor("remote-wallet"),
        action: Action.CREATE,
        resource: { type: Resource.W_CREDENTIAL },
        reason: "Invalid authorization"
      });
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const token = authorizationHeader.split(" ")[1];
    let validatedIdToken;
    try {
      validatedIdToken = await this.secureTokenService.validateIDToken(token);
    } catch (error) {
      await this.protocolAuditService.logDenied({
        caller:
          this.protocolAuditService.createUnknownServiceActor("remote-wallet"),
        action: Action.CREATE,
        resource: { type: Resource.W_CREDENTIAL },
        reason:
          error instanceof Error
            ? error.message
            : "Invalid self-issued ID token"
      });
      throw error;
    }
    const accessToken = validatedIdToken["token"];
    if (!accessToken) {
      await this.protocolAuditService.logDenied({
        caller: this.protocolAuditService.createPeerServiceActor(
          validatedIdToken.sub,
          "remote-wallet"
        ),
        action: Action.CREATE,
        resource: { type: Resource.W_CREDENTIAL },
        reason: "No access token in self-issued ID token"
      });
      throw new AppError(
        "No access token in self-issued ID token",
        HttpStatus.UNAUTHORIZED
      );
    }

    const preAuthorizedCode = validatedIdToken["pre-authorized_code"];
    if (!preAuthorizedCode) {
      await this.protocolAuditService.logDenied({
        caller: this.protocolAuditService.createPeerServiceActor(
          validatedIdToken.sub,
          "remote-wallet"
        ),
        action: Action.CREATE,
        resource: { type: Resource.W_CREDENTIAL },
        reason: "Only pre-authorized code flows supported"
      });
      throw new AppError(
        "Only pre-authorized code flows supported",
        HttpStatus.NOT_IMPLEMENTED
      );
    }

    const holderDid = await resolveDid(validatedIdToken.sub);
    const holderCredentialService = holderDid.service?.find(
      (service) => service.type === "CredentialService"
    );
    if (!holderCredentialService) {
      throw new AppError(
        "Holder DID does not have a CredentialService defined",
        HttpStatus.BAD_REQUEST
      );
    }

    const issuance = await this.issuanceRepository.findOneBy({
      holderId: validatedIdToken.sub,
      preAuthorizedCode: preAuthorizedCode
    });

    if (!issuance) {
      throw new AppError(
        "No credential issuance flow found",
        HttpStatus.NOT_FOUND
      );
    }
    if (issuance.remoteId) {
      throw new AppError(
        "Credential issuance flow already started",
        HttpStatus.BAD_REQUEST
      );
    }
    const issueConfigs =
      await this.issueConfigurationService.getIssueConfigurations();
    if (
      credentialRequestMessage.credentials.length !== 1 ||
      !issueConfigs.some(
        (issueConfig) =>
          credentialRequestMessage.credentials[0].id ===
          `${didId}#${issueConfig.id}`
      )
    ) {
      throw new AppError(
        "Invalid credential request message",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    await this.issuanceRepository.update(
      { id: issuance.id },
      { remoteId: credentialRequestMessage.holderPid }
    );

    setImmediate(async () => {
      try {
        let credentialMessage: CredentialMessage;
        let idToken: string;
        try {
          const issueConfig =
            await this.issueConfigurationService.getIssueConfigurationByType(
              issuance.credentialType
            );
          const credentialConfig = plainToInstance(InitCredentialConfig, {
            context: [
              issueConfig.documentUrl ??
                `${this.config.server.publicAddress}${API_PREFIX}/issue-configuration/${issueConfig.id}`
            ],
            type: [issuance.credentialType],
            id: `${issuance.holderId}#${crypto.randomUUID()}`,
            credentialSubject: issuance.credentialSubject,
            proofType: issueConfig.proofType
          });
          const credential = await this.credentialService.issueCredential(
            credentialConfig,
            issuance.holderId
          );
          credentialMessage = {
            "@context": [
              "https://w3id.org/dspace-dcp/v1.0/dcp.jsonld",
              issueConfig.documentUrl ??
                `${this.config.server.publicAddress}${API_PREFIX}/issue-configuration/${issueConfig.id}`
            ],
            type: "CredentialMessage",
            credentials: [
              {
                credentialType: issuance.credentialType,
                payload:
                  issueConfig.proofType === "jwt"
                    ? credential.jwt!
                    : JSON.stringify({
                        ...credential.credential,
                        proof: credential.proof
                      }),
                format: issueConfig.proofType
              }
            ],
            issuerPid: randomUUID(),
            holderPid: credentialRequestMessage.holderPid,
            status: "ISSUED"
          };
          idToken = await this.secureTokenService.createSelfIssuedIDToken({
            audience: holderDid.id,
            existingAccessToken: accessToken,
            createAccessToken: false
          });
          await this.issuanceRepository.update(
            { id: issuance.id },
            { credentialId: credential.id }
          );
        } catch (error) {
          throw new AppError(
            `[ASYNC] Error while issuing credential: ${error}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
            error
          ).andLog(this.logger);
        }
        try {
          await axios.post(
            `${holderCredentialService.serviceEndpoint}/credentials`,
            credentialMessage,
            {
              headers: {
                Authorization: `Bearer ${idToken}`
              }
            }
          );
        } catch (error) {
          throw parseNetworkError(
            error,
            "sending credential to holder [ASYNC]"
          ).andLog(this.logger);
        }
      } catch (_) {
        this.logger.error(`Error in async issuance flow`);
      }
    });

    await this.protocolAuditService.logAllowed({
      caller: this.protocolAuditService.createPeerServiceActor(
        validatedIdToken.sub,
        "remote-wallet"
      ),
      action: Action.CREATE,
      resource: { type: Resource.W_CREDENTIAL, id: issuance.id },
      reason: "si_token_validated"
    });

    return {
      url: `${this.config.server.publicAddress}${API_PREFIX}/dcp/issuer/requests/${issuance.id}`
    };
  }

  async handleCredentialStatusRequest(
    authorizationHeader: string | undefined,
    requestId: string
  ): Promise<CredentialStatus> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      await this.protocolAuditService.logDenied({
        caller:
          this.protocolAuditService.createUnknownServiceActor("remote-wallet"),
        action: Action.READ,
        resource: { type: Resource.W_CREDENTIAL, id: requestId },
        reason: "Invalid authorization"
      });
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const token = authorizationHeader.split(" ")[1];
    let validatedIdToken;
    try {
      validatedIdToken = await this.secureTokenService.validateIDToken(token);
    } catch (error) {
      await this.protocolAuditService.logDenied({
        caller:
          this.protocolAuditService.createUnknownServiceActor("remote-wallet"),
        action: Action.READ,
        resource: { type: Resource.W_CREDENTIAL, id: requestId },
        reason:
          error instanceof Error
            ? error.message
            : "Invalid self-issued ID token"
      });
      throw error;
    }

    const issuance = await this.issuanceRepository.findOneBy({
      holderId: validatedIdToken.sub,
      id: requestId,
      remoteId: Not(IsNull())
    });

    if (!issuance) {
      throw new AppError(
        "No credential issuance flow found",
        HttpStatus.NOT_FOUND
      );
    }
    await this.protocolAuditService.logAllowed({
      caller: this.protocolAuditService.createPeerServiceActor(
        validatedIdToken.sub,
        "remote-wallet"
      ),
      action: Action.READ,
      resource: { type: Resource.W_CREDENTIAL, id: requestId },
      reason: "si_token_validated"
    });
    return {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: "CredentialStatus",
      issuerPid: `${issuance.id}`,
      holderPid: issuance.remoteId!,
      status: issuance.credentialId ? "ISSUED" : "RECEIVED"
    };
  }
}
