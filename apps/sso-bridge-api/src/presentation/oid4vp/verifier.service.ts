import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, AuthorizationRequest } from "@tsg-dsp/common-api";
import {
  AuthorizationResponse,
  PresentationAuthorizationRequest,
  PresentationDefinition
} from "@tsg-dsp/common-dtos";
import crypto from "crypto";
import { Request, Response } from "express";
import { Repository } from "typeorm";

import { RootConfig } from "../../config.js";
import { AuthorizationRequestDao } from "../../model/oid4vp.dao.js";
import { OauthUser } from "../../model/user.dao.js";
import { OauthService } from "../../oauth/oauth.service.js";
import { UsersService } from "../../users/users.service.js";
import { getSession } from "../../utils/session.js";
import { PresentationService } from "../presentation.service.js";

@Injectable()
export class OID4VPVerifierService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(AuthorizationRequestDao)
    public authorizationRequestRepository: Repository<AuthorizationRequestDao>,
    private readonly oauthService: OauthService,
    private readonly usersService: UsersService,
    private readonly presentationService: PresentationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async getAuthorizationRequestFromDB(
    id: string
  ): Promise<AuthorizationRequestDao> {
    const authorizationRequest =
      await this.authorizationRequestRepository.findOne({
        where: {
          identifier: id
        },
        relations: ["user"]
      });
    if (!authorizationRequest) {
      throw new AppError(
        `Could not find the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    return authorizationRequest;
  }

  private getOid4vpUri(identifier: string): string {
    return `oid4vp://?client_id=${this.config.server.publicAddress}&request_uri=${this.config.server.publicAddress}/api/oid4vp/ar/${identifier}`;
  }

  async obtainAuthorizationRequestUrl(
    identifier: string,
    authorizationRequest: AuthorizationRequest
  ): Promise<string> {
    try {
      await this.getAuthorizationRequestFromDB(identifier);
      return this.getOid4vpUri(identifier);
    } catch (err: unknown) {
      if (err instanceof AppError && err.getStatus() === HttpStatus.NOT_FOUND) {
        return await this.createAuthorizationRequest(
          identifier,
          authorizationRequest
        );
      } else {
        throw err;
      }
    }
  }

  async createAuthorizationRequest(
    identifier: string,
    authorizationRequest: AuthorizationRequest
  ): Promise<string> {
    const presentationDefinition: PresentationDefinition = JSON.parse(
      this.config.presentationDefinition
    );
    await this.authorizationRequestRepository.save({
      identifier: identifier,
      nonce: crypto.randomBytes(48).toString("hex"),
      presentationDefinition: presentationDefinition,
      authorizationRequest: authorizationRequest
    });
    return this.getOid4vpUri(identifier);
  }

  async getAuthorizationRequest(
    id: string
  ): Promise<PresentationAuthorizationRequest> {
    const authorizationRequest = await this.getAuthorizationRequestFromDB(id);
    return {
      state: authorizationRequest.identifier,
      nonce: authorizationRequest.nonce,
      presentation_definition: authorizationRequest.presentationDefinition,
      client_id: `${this.config.server.publicAddress}`,
      response_uri: `${this.config.server.publicAddress}/api/oid4vp/authorize`,
      response_type: "vp_token",
      response_mode: "direct_post"
    };
  }

  async setSession(request: Request, response: Response, id: string) {
    const authorizationRequest = await this.getAuthorizationRequestFromDB(id);
    if (!authorizationRequest.authorizationRequest) {
      throw new AppError(
        `Could not find the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    if (!authorizationRequest.user) {
      throw new AppError(
        `Could not find the user for the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }

    const loginResult = await this.oauthService.handleAuthorizationRequest(
      authorizationRequest.authorizationRequest,
      authorizationRequest.user
    );

    const session = getSession(request);
    if (session && !session.user) {
      session.user = authorizationRequest.user;
    }

    response.redirect(loginResult.url);
  }

  async verify(authorizationResponse: AuthorizationResponse) {
    const obj = await this.getAuthorizationRequestFromDB(
      authorizationResponse.state
    );
    const vp = await this.presentationService.evaluatePresentationResponse(
      obj.presentationDefinition,
      {
        vp_token: authorizationResponse.vp_token,
        presentation_submission: authorizationResponse.presentation_submission
      }
    );

    const verifiableCredentials = Array.isArray(vp.verifiableCredential)
      ? vp.verifiableCredential
      : [vp.verifiableCredential];

    let email: string | undefined;

    for (const vc of verifiableCredentials) {
      const subjects = Array.isArray(vc.credentialSubject)
        ? vc.credentialSubject
        : [vc.credentialSubject];
      for (const subject of subjects) {
        if (subject.email) {
          email = subject.email;
          break;
        }
      }
      if (email) break;
    }

    if (!email) {
      throw new AppError(
        "Could not find email in the verifiable presentation",
        HttpStatus.BAD_REQUEST
      );
    }

    let user: OauthUser;
    try {
      user = await this.usersService.getUserByEmail(email);
    } catch (err) {
      if (
        !(err instanceof AppError && err.getStatus() === HttpStatus.NOT_FOUND)
      ) {
        throw err;
      }
      user = await this.usersService.createUser({
        username: email,
        email: email,
        password: "password",
        roles: [
          "wallet_view_did",
          "wallet_manage_keys",
          "wallet_use_keys",
          "wallet_view_own_credentials",
          "wallet_view_all_credentials",
          "wallet_manage_own_credentials",
          "wallet_manage_all_credentials",
          "wallet_issue_credentials",
          "wallet_view_presentations",
          "wallet_manage_clients",
          "controlplane_admin",
          "controlplane_dataplane"
        ],
        grants: ["authorization_code"]
      });
    }
    obj.user = user;
    obj.completed = true;
    await this.authorizationRequestRepository.save(obj);
    return user;
  }
}
