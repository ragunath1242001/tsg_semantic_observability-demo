import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  AppError,
  parseNetworkError,
  promiseMap,
  validateOrRejectSync
} from "@tsg-dsp/common-api";
import { formatCredential, VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  CredentialMessage,
  CredentialOfferMessage,
  CredentialRequestMessage,
  IssuerMetadata
} from "@tsg-dsp/common-dtos";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import { DCPCredentialRequestInitiation } from "@tsg-dsp/wallet-dtos";
import axios, { AxiosResponse } from "axios";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import { RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import { retry } from "../../utils/retry.js";

@Injectable()
export class DCPHolderService {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly secureTokenService: SecureTokenService,
    private readonly config: RootConfig
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  initialized: Promise<boolean>;
  async init() {
    this.logger.log("Initializing HolderService");
    const existingCredentials = await this.credentialsService.getCredentials();
    const existingTypes = existingCredentials.flatMap((c) => c.credential.type);
    await promiseMap(this.config.issuance.dcp, (config) =>
      retry(
        async () => {
          if (
            config.credentialType.every((type) => existingTypes.includes(type))
          ) {
            this.logger.log(
              `Already holding ${config.credentialType.join(", ")} credential(s), skipping request`
            );
          } else {
            await this.requestCredential(config);
          }
        },
        `request credential for ${config.credentialType.join(", ")}`
      )
    );
    return true;
  }

  private async fetchIssuerMetadata(issuerId: string): Promise<{
    issuerService: string;
    metadata: IssuerMetadata;
  }> {
    const issuerDid = await resolveDid(issuerId);
    const issuerService = issuerDid.service?.find(
      (s) => s.type === "IssuerService" && typeof s.serviceEndpoint === "string"
    );
    if (!issuerService) {
      throw new AppError(
        `No issuer service present in issuer DID document`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    try {
      const metadataRequest = await axios.get<IssuerMetadata>(
        `${issuerService.serviceEndpoint}/metadata`
      );
      return {
        issuerService: `${issuerService.serviceEndpoint}`,
        metadata: metadataRequest.data
      };
    } catch (err) {
      throw parseNetworkError(err, "issuer metadata");
    }
  }

  async requestCredential(
    request: DCPCredentialRequestInitiation
  ): Promise<void> {
    const { issuerService, metadata } = await this.fetchIssuerMetadata(
      request.issuerId
    );
    const credentials = request.credentialType.map((credentialType) => {
      const supportedCredentials = metadata.credentialsSupported.filter(
        (credentialObject) => credentialObject.credentialType === credentialType
      );

      if (supportedCredentials.length === 0) {
        throw new AppError(
          `Issuer does not support credential type: ${credentialType}`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }

      const bestMatch = supportedCredentials.reduce((best, current) => {
        const currentProfile = this.formatDcpProfile(current.profile);
        const bestProfile = this.formatDcpProfile(best.profile);
        return currentProfile.score > bestProfile.score ? current : best;
      });

      return { id: bestMatch.id };
    });

    const accessToken = await this.secureTokenService.createSelfIssuedIDToken({
      audience: request.issuerId,
      createAccessToken: true,
      preAuthorizedCode: request.preAuthorizedCode
    });

    const holderPid = randomUUID();

    const credentialRequestMessage: CredentialRequestMessage = {
      "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
      type: "CredentialRequestMessage",
      holderPid: holderPid,
      credentials: credentials
    };

    let credentialRequest: AxiosResponse;
    try {
      credentialRequest = await axios.post(
        `${issuerService}/credentials`,
        credentialRequestMessage,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
    } catch (err) {
      throw parseNetworkError(err, "credential request");
    }
    if (!credentialRequest.headers["location"]) {
      this.logger.debug(credentialRequest);
      throw new AppError(
        "No credential request status location in response",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    } else {
      this.logger.debug(
        `Credential request status location: ${credentialRequest.headers["location"]}`
      );
    }
  }

  async handleCredentialMessage(
    authorizationHeader: string | undefined,
    credentialMessage: CredentialMessage
  ): Promise<void> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const token = authorizationHeader.split(" ")[1];
    const validatedIdToken =
      await this.secureTokenService.validateIDToken(token);

    if (credentialMessage.status === "REJECTED") {
      this.logger.warn(
        `Credential request rejected by ${credentialMessage.issuerPid}: ${credentialMessage.rejectionReason}`
      );
      return;
    }

    if (
      !credentialMessage.credentials ||
      credentialMessage.credentials.length === 0
    ) {
      throw new AppError(
        `No credentials in credential message`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    for (const credential of credentialMessage.credentials) {
      if (credential.format === "jwt") {
        const credentialContainer = formatCredential(credential.payload);
        if (credentialContainer.credential.issuer !== validatedIdToken.sub) {
          throw new AppError(
            `Credential issuer ${credentialContainer.credential.issuer} does not match token subject ${validatedIdToken.sub}`,
            HttpStatus.BAD_REQUEST
          ).andLog(this.logger);
        }
        await this.credentialsService.importCredential(credential.payload);
        this.logger.log(
          `Imported JWT credential ${credentialContainer.credential.id}`
        );
      } else if (credential.format === "ldp") {
        const credentialObject = validateOrRejectSync(
          plainToInstance(VerifiableCredential, JSON.parse(credential.payload))
        );
        if (credentialObject.issuer !== validatedIdToken.sub) {
          throw new AppError(
            `Credential issuer ${credentialObject.issuer} does not match token subject ${validatedIdToken.sub}`,
            HttpStatus.BAD_REQUEST
          ).andLog(this.logger);
        }
        await this.credentialsService.importCredential(credentialObject);
        this.logger.log(`Imported credential ${credentialObject.id}`);
      } else {
        throw new AppError(
          `Unsupported credential format: ${credential.format}`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
    }
  }

  formatDcpProfile(profile: string) {
    const regex = /^(vc\d+)-([\w\d]+)\/([\w\d]+)$/;
    const match = profile.match(regex);

    if (!match) {
      throw new AppError(
        `Invalid DCP profile format: ${profile}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    const vcDataModel = match[1];
    const revocationSystem = match[2];
    const proofStack = match[3];

    return {
      score:
        (vcDataModel === "vc20" ? 4 : vcDataModel === "vc11" ? 1 : 0) +
        (revocationSystem === "bssl"
          ? 4
          : revocationSystem === "sl2021"
            ? 0
            : -1) +
        (proofStack === "jwt" ? 4 : proofStack === "ldp" ? 2 : 0),
      vcDataModel,
      revocationSystem,
      proofStack
    };
  }

  async handleCredentialOfferMessage(
    authorization: string | undefined,
    credentialOfferMessage: CredentialOfferMessage
  ): Promise<void> {
    this.logger.debug(
      `Received credential offer message: ${JSON.stringify(credentialOfferMessage, null, 2)} and authorization: ${authorization}`
    );
    throw new AppError("Method not implemented", HttpStatus.NOT_IMPLEMENTED);
  }
}
