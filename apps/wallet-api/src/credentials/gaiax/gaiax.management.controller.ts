import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RuntimeConfig } from "../../config.js";
import { AppError } from "@tsg-dsp/common-api";
import { ClientInfo, AppRole } from "@tsg-dsp/wallet-dtos";
import {
  ComplianceRequest,
  LegalRegistrationNumberRequest
} from "@tsg-dsp/wallet-dtos";
import { GaiaXService } from "./gaiax.service.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { CredentialsDto } from "../credentials.schemas.js";
import {
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault
} from "@tsg-dsp/common-dtos";
import { validationPipe, Client } from "@tsg-dsp/common-api";

@Controller("management/credentials/gaiax")
@ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
@ApiTags("Management Gaia-X Credentials")
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
  @ApiOperation({
    summary: "Issue legal registration number credential",
    description:
      "Self-issue a Legal Registration Number credential following the Gaia-X Trust Framework"
  })
  @ApiBody({ type: LegalRegistrationNumberRequest })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async requestLegalRegistrationNumberCredential(
    @Body(validationPipe)
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
  @ApiOperation({
    summary: "Request compliance credential",
    description:
      "Request a compliance credential from a Gaia-X Digital Clearing House based on existing credentials within this wallet"
  })
  @ApiBody({ type: ComplianceRequest })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async requestComplianceCredential(
    @Body(validationPipe)
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
