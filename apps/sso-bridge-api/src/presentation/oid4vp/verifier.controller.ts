import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiParam
} from "@nestjs/swagger";
import { DisableOAuthGuard, DisableRolesGuard } from "@tsg-dsp/common-api";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Redirect,
  Req,
  Res
} from "@nestjs/common";
import {
  ApiForbiddenResponseDefault,
  PresentationAuthorizationRequest,
  AuthorizationResponse
} from "@tsg-dsp/common-dtos";
import { Request, Response } from "express";
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

  @Get("status/:id")
  @ApiOperation({
    summary: "Get the Authorization Request Status",
    description: "Get the Authorization Request Status."
  })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async status(@Param("id") id: string) {
    return this.oid4vpVerifierService.getAuthorizationRequestFromDB(id);
  }

  @Get("redirect/:id")
  @ApiOperation({
    summary: "Redirect to the Authorization Request",
    description: "Redirect to the Authorization Request."
  })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.OK)
  @Redirect(undefined, HttpStatus.FOUND)
  async redirect(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.oid4vpVerifierService.setSession(req, res, id);
  }

  @Post("authorize")
  @ApiOperation({
    summary: "Add an Authorization Request",
    description:
      "Add an Authorization Request according to the OID4VP specification."
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AuthorizationResponse })
  async authorize(@Body() authorizationResponse: AuthorizationResponse) {
    await this.oid4vpVerifierService.verify(authorizationResponse);
  }
}
