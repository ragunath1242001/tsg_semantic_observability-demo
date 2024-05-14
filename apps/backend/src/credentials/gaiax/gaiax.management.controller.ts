import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { RuntimeConfig } from "../../config.js";
import { Client } from "../../auth/roles.guard.js";
import { AppError } from "../../utils/error.js";
import { ClientInfo, AppRole } from "@libs/dtos";
import { ComplianceRequest, LegalRegistrationNumberRequest } from "@libs/dtos";
import { GaiaXService } from "./gaiax.service.js";

@Controller("management/credentials/gaiax")
export class GaiaXManagementController {
  constructor(
    private readonly gaiaXService: GaiaXService,
    private readonly config: RuntimeConfig
  ) {}

  private targetDid(
    action: "view" | "manage",
    client: ClientInfo
  ): string | undefined {
    switch (action) {
      case "view":
        if (client.roles.includes(AppRole.VIEW_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.VIEW_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(
            `Not allowed to view credentials`,
            HttpStatus.FORBIDDEN
          );
        }
      case "manage":
        if (client.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(
            `Not allowed to manage credentials`,
            HttpStatus.FORBIDDEN
          );
        }
    }
  }

  @Post("legalRegistrationNumber")
  @HttpCode(HttpStatus.OK)
  async requestLegalRegistrationNumberCredential(
    @Body(new ValidationPipe({ transform: true }))
    credentialConfig: LegalRegistrationNumberRequest,
    @Client() client: ClientInfo
  ) {
    if (!this.config.gaiaXSupport) {
      return new AppError(
        "Gaia-X credential support is disabled",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    const targetDid = this.targetDid("manage", client);
    return this.gaiaXService.requestLegalRegistrationNumberCredential(
      credentialConfig,
      targetDid
    );
  }

  @Post("compliance")
  @HttpCode(HttpStatus.OK)
  async requestComplianceCredential(
    @Body(new ValidationPipe({ transform: true }))
    credentialConfig: ComplianceRequest,
    @Client() client: ClientInfo
  ) {
    if (!this.config.gaiaXSupport) {
      return new AppError(
        "Gaia-X credential support is disabled",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    const targetDid = this.targetDid("manage", client);
    return this.gaiaXService.requestComplianceCredential(
      credentialConfig,
      targetDid
    );
  }
}
