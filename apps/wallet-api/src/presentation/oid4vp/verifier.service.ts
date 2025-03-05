import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError, ServerConfig } from "@tsg-dsp/common-api";
import {
  PresentationAuthorizationRequest,
  AuthorizationResponse,
  PresentationDefinition
} from "@tsg-dsp/common-dtos";
import crypto from "crypto";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AuthorizationRequestDao } from "../../model/presentation.dao.js";
import { PresentationService } from "../presentation.service.js";
@Injectable()
export class OID4VPVerifierService {
  constructor(
    private readonly serverConfig: ServerConfig,
    @InjectRepository(AuthorizationRequestDao)
    public authorizationRequestRepository: Repository<AuthorizationRequestDao>,
    private readonly presentationService: PresentationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private async getAuthorizationRequestFromDB(
    id: string
  ): Promise<AuthorizationRequestDao> {
    const authorizationRequest =
      await this.authorizationRequestRepository.findOneBy({
        identifier: id
      });
    if (!authorizationRequest) {
      throw new AppError(
        `Could not find the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    return authorizationRequest;
  }

  async createAuthorizationRequest(
    presentationDefinition: PresentationDefinition
  ): Promise<string> {
    const id = crypto.randomUUID();
    await this.authorizationRequestRepository.save({
      identifier: id,
      nonce: crypto.randomBytes(48).toString("hex"),
      presentationDefinition: presentationDefinition
    });
    return `oid4vp://?client_id=${this.serverConfig.publicAddress}&request_uri=${this.serverConfig.publicAddress}/api/oid4vp/ar/${id}`;
  }

  async getAuthorizationRequest(
    id: string
  ): Promise<PresentationAuthorizationRequest> {
    const authorizationRequest = await this.getAuthorizationRequestFromDB(id);
    return {
      state: authorizationRequest.identifier,
      nonce: authorizationRequest.nonce,
      presentation_definition: authorizationRequest.presentationDefinition,
      client_id: `${this.serverConfig.publicAddress}`,
      response_uri: `${this.serverConfig.publicAddress}/api/oid4vp/authorize`,
      response_type: "vp_token",
      response_mode: "direct_post"
    };
  }

  async verify(authorizationResponse: AuthorizationResponse): Promise<string> {
    const obj = await this.getAuthorizationRequestFromDB(
      authorizationResponse.state
    );
    await this.presentationService.evaluatePresentationResponse(
      obj.presentationDefinition,
      {
        vp_token: authorizationResponse.vp_token,
        presentation_submission: authorizationResponse.presentation_submission
      }
    );
    return "Your Verifiable Presentation has been validated, you may now proceed.";
  }
}
