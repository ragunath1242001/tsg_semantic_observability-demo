import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import {
  DisableAbac,
  DisableOAuthGuard,
  validationPipe
} from "@tsg-dsp/common-api";
import {
  ApiForbiddenResponseDefault,
  OID4VPAuthorizationRequest,
  OID4VPAuthorizationResponse
} from "@tsg-dsp/common-dtos";

import { OID4VPVerifierService } from "./verifier.service.js";

@DisableOAuthGuard()
@DisableAbac
@ApiTags("OID4VP")
@Controller("oid4vp")
export class OID4VPVerifierController {
  private readonly logger = new Logger(OID4VPVerifierController.name);

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
  ): Promise<OID4VPAuthorizationRequest> {
    return this.oid4vpVerifierService.getAuthorizationRequest(id);
  }

  @Post("authorize")
  @ApiOperation({
    summary: "Submit Authorization Response",
    description:
      "Submit an Authorization Response according to the OID4VP 1.0 specification using form-urlencoded format."
  })
  @HttpCode(HttpStatus.OK)
  @ApiConsumes("application/x-www-form-urlencoded")
  @ApiBody({
    type: OID4VPAuthorizationResponse,
    description:
      "Authorization response in form-urlencoded format as per OID4VP 1.0 specification."
  })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async status(
    @Body(validationPipe) authResponse: OID4VPAuthorizationResponse
  ): Promise<string> {
    this.logger.debug(
      `Received authorization response: ${JSON.stringify(authResponse)}`
    );

    return await this.oid4vpVerifierService.verify(authResponse);
  }
}
