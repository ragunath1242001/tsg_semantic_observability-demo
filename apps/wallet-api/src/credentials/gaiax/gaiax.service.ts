import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  toArray,
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { AppError, parseNetworkError } from "../../utils/error.js";
import { DidService } from "../../did/did.service.js";
import {
  ComplianceRequest,
  LegalRegistrationNumberRequest
} from "@tsg-dsp/wallet-dtos";
import axios from "axios";
import { CredentialsService } from "../credentials.service.js";

@Injectable()
export class GaiaXService {
  constructor(
    private readonly didService: DidService,
    private readonly credentialsService: CredentialsService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async requestLegalRegistrationNumberCredential(
    credentialConfig: LegalRegistrationNumberRequest,
    targetDid: string | undefined
  ) {
    if (
      targetDid &&
      (!credentialConfig.vcId.startsWith(targetDid) ||
        credentialConfig.credentialSubject.id !== targetDid)
    ) {
      throw new AppError(
        `Can't request credential with these identifiers`,
        HttpStatus.FORBIDDEN
      ).andLog(this.logger, "warn");
    }
    try {
      const response = await axios.post<VerifiableCredential>(
        `https://${credentialConfig.clearingHouse}/registrationNumberVC`,
        credentialConfig.credentialSubject,
        {
          params: {
            vcid: credentialConfig.vcId
          }
        }
      );
      return await this.credentialsService.importCredential(
        response.data,
        credentialConfig.credentialSubject.id
      );
    } catch (err) {
      throw parseNetworkError(
        err,
        "requesting legal registration number credential"
      );
    }
  }

  async requestComplianceCredential(
    complianceRequest: ComplianceRequest,
    targetDid: string | undefined
  ) {
    if (targetDid && !complianceRequest.vcId.startsWith(targetDid)) {
      throw new AppError(
        `Can't request credential with these identifiers`,
        HttpStatus.FORBIDDEN
      ).andLog(this.logger, "warn");
    }
    try {
      const presentation: VerifiablePresentation = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        id: `${this.didService.getDidId()}#${crypto.randomUUID()}`,
        verifiableCredential: complianceRequest.credentials
      };
      const response = await axios.post<VerifiableCredential>(
        `https://${complianceRequest.clearingHouse}/api/credential-offers`,
        presentation,
        {
          params: {
            vcid: complianceRequest.vcId
          }
        }
      );
      return await this.credentialsService.importCredential(
        response.data,
        toArray(complianceRequest.credentials[0].credentialSubject)[0].id
      );
    } catch (err) {
      throw parseNetworkError(err, "requesting compliance credential");
    }
  }
}
