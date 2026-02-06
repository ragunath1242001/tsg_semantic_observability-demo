import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  AppError,
  DisableAbac,
  DisableOAuthGuard,
  Requires
} from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  DcqlQuery,
  Resource
} from "@tsg-dsp/common-dtos";

import { RuntimeConfig } from "../../config.js";
import { OID4VPVerifierService } from "./verifier.service.js";

@Controller("management/oid4vp/verifier")
@ApiTags("OID4VP")
@Requires(Action.READ, Resource.W_PRESENTATION)
export class OID4VPVerifierManagementController {
  constructor(
    private readonly oid4vpVerifierService: OID4VPVerifierService,
    private readonly runtimeConfig: RuntimeConfig
  ) {}

  @Post("create")
  @ApiOperation({
    summary: "Add an Authorization Request",
    description:
      "Add an Authorization Request according to the OID4VP specification."
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: DcqlQuery })
  @ApiOkResponse({ type: String })
  @ApiForbiddenResponseDefault()
  async create(@Body() dcqlQuery: DcqlQuery): Promise<string> {
    return this.oid4vpVerifierService.createAuthorizationRequest(dcqlQuery);
  }
  @Post("create/public")
  @ApiOperation({
    summary: "Add a public Authorization Request",
    description:
      "Add an Authorization Request according to the OID4VP specification, allowed for unauthenticated requests."
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: DcqlQuery })
  @ApiOkResponse({ type: String })
  @DisableOAuthGuard()
  @DisableAbac
  @ApiForbiddenResponseDefault()
  async createPublic(@Body() dcqlQuery: DcqlQuery): Promise<string> {
    if (this.runtimeConfig.acceptUnauthenticatedCredentialRequests !== true) {
      throw new AppError(
        "This wallet does not accept unauthenticated credential requests",
        HttpStatus.FORBIDDEN
      );
    }
    return this.oid4vpVerifierService.createAuthorizationRequest(dcqlQuery);
  }
}
