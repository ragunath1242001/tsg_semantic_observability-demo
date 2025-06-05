import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, parseNetworkError } from "@tsg-dsp/common-api";
import {
  CredentialMessage,
  CredentialObject,
  CredentialRequestMessage,
  CredentialStatus,
  IssuerMetadata
} from "@tsg-dsp/common-dtos";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";
import { IsNull, Not, Repository } from "typeorm";

import { InitCredentialConfig, RootConfig } from "../../config.js";
import { ContextService } from "../../contexts/context.service.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import { CredentialIssuance } from "../../model/issuance.dao.js";

@Injectable()
export class DCPIssuerService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(CredentialIssuance)
    private readonly issuanceRepository: Repository<CredentialIssuance>,
    private readonly didService: DidService,
    private readonly secureTokenService: SecureTokenService,
    private readonly contextService: ContextService,
    private readonly credentialService: CredentialsService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async issuerMetadata(): Promise<IssuerMetadata> {
    const didId = await this.didService.getDidId();
    const contexts = await this.contextService.getContexts();
    const metadata: IssuerMetadata = {
      "@context": [
        "https://w3id.org/dspace-dcp/v1.0/dcp.jsonld",
        ...contexts
          .filter((context) => context.issuable)
          .map(
            (context) =>
              context.documentUrl ??
              `${this.config.server.publicAddress}/api/context/${context.id}`
          )
      ],
      type: "IssuerMetadata",
      credentialIssuer: didId,
      credentialsSupported: contexts
        .filter((context) => context.issuable)
        .map((context) => {
          const credentialObject: CredentialObject = {
            type: "CredentialObject",
            credentialType: ["VerifiableCredential", context.credentialType],
            offerReason: "reissue",
            bindingMethods: ["did:web", "did:tdw"],
            profiles: ["vc11-bssl/ld"]
          };
          return credentialObject;
        })
    };
    return metadata;
  }

  async handleCredentialRequest(
    authorizationHeader: string,
    credentialRequestMessage: CredentialRequestMessage
  ) {
    if (!authorizationHeader.startsWith("Bearer ")) {
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const token = authorizationHeader.split(" ")[1];
    const validatedIdToken =
      await this.secureTokenService.validateIDToken(token);
    const accessToken = validatedIdToken["token"];
    if (!accessToken) {
      throw new AppError(
        "No access token in self-issued ID token",
        HttpStatus.UNAUTHORIZED
      );
    }

    const preAuthorizedCode = validatedIdToken["pre-authorized_code"];
    if (!preAuthorizedCode) {
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
    await this.issuanceRepository.update(
      { id: issuance.id },
      { remoteId: credentialRequestMessage.holderPid }
    );

    setImmediate(async () => {
      try {
        let credentialMessage: CredentialMessage;
        let idToken: string;
        try {
          const context = await this.contextService.getContextByType(
            issuance.credentialType
          );
          const credentialConfig = plainToInstance(InitCredentialConfig, {
            context: [
              context.documentUrl ??
                `${this.config.server.publicAddress}/api/context/${context.id}`
            ],
            type: [issuance.credentialType],
            id: `${issuance.holderId}#${crypto.randomUUID()}`,
            credentialSubject: issuance.credentialSubject
          });
          const credential = await this.credentialService.issueCredential(
            credentialConfig,
            issuance.holderId
          );
          credentialMessage = {
            "@context": [
              "https://w3id.org/dspace-dcp/v1.0/dcp.jsonld",
              context.documentUrl ??
                `${this.config.server.publicAddress}/api/context/${context.id}`
            ],
            type: "CredentialMessage",
            credentials: [
              {
                type: "CredentialContainer",
                credentialType: issuance.credentialType,
                payload: JSON.stringify(credential.credential),
                format: "json-ld"
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

    return {
      url: `${this.config.server.publicAddress}/api/dcp/issuer/requests/${issuance.id}`
    };
  }

  async handleCredentialStatusRequest(
    authorizationHeader: string,
    requestId: string
  ): Promise<CredentialStatus> {
    if (!authorizationHeader.startsWith("Bearer ")) {
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const token = authorizationHeader.split(" ")[1];
    const validatedIdToken =
      await this.secureTokenService.validateIDToken(token);

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
    return {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: "CredentialStatus",
      issuerPid: `${issuance.id}`,
      holderPid: issuance.remoteId!,
      status: issuance.credentialId ? "ISSUED" : "RECEIVED"
    };
  }
}
