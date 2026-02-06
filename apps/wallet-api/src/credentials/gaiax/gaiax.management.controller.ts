import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  AppError,
  Client,
  ClientInfo,
  EffectiveScope,
  Requires,
  validationPipe
} from "@tsg-dsp/common-api";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";
import {
  ComplianceRequest,
  LegalRegistrationNumberRequest
} from "@tsg-dsp/wallet-dtos";

import { RuntimeConfig } from "../../config.js";
import { CredentialsDto } from "../credentials.schemas.js";
import { GaiaXService } from "./gaiax.service.js";

function scopeToTargetDid(
  scope: EffectiveScope,
  clientDidId?: string
): string | undefined {
  if (scope === "*" || scope === null) {
    return undefined;
  }
  return clientDidId;
}

@Controller("management/credentials/gaiax")
@Requires(Action.CREATE, Resource.W_CREDENTIAL)
@ApiTags("Management Gaia-X Credentials")
export class GaiaXManagementController {
  constructor(
    private readonly gaiaXService: GaiaXService,
    private readonly config: RuntimeConfig
  ) {}

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
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.MANAGE, Resource.W_CREDENTIAL),
      client.didId
    );
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
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.MANAGE, Resource.W_CREDENTIAL),
      client.didId
    );
    return this.gaiaXService.requestComplianceCredential(
      credentialConfig,
      targetDid
    );
  }
}
