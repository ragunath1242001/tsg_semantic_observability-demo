import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { DisableOAuthGuard, DisableRolesGuard } from "@tsg-dsp/common-api";
import {
  ApiForbiddenResponseDefault,
  AuthorizationResponse,
  PresentationAuthorizationRequest
} from "@tsg-dsp/common-dtos";

import { OID4VPVerifierService } from "./verifier.service.js";

@DisableOAuthGuard()
@DisableRolesGuard()
@ApiTags("OID4VP")
@Controller("oid4vp")
export class OID4VPVerifierController {
  constructor(private readonly oid4vpVerifierService: OID4VPVerifierService) {}

  @Get("ar/:id")
  @ApiOperation({
    summary: "Get the Authorization Request",
    description:
      "Get the Authorization Request according to the OID4VP specification."
  })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async getAuthorizationRequest(
    @Param("id") id: string
  ): Promise<PresentationAuthorizationRequest> {
    return this.oid4vpVerifierService.getAuthorizationRequest(id);
  }

  @Post("authorize")
  @ApiOperation({
    summary: "Add an Authorization Request",
    description:
      "Add an Authorization Request according to the OID4VP specification."
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AuthorizationResponse })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async status(
    @Body() authorizationResponse: AuthorizationResponse
  ): Promise<string> {
    return await this.oid4vpVerifierService.verify(authorizationResponse);
  }
}
