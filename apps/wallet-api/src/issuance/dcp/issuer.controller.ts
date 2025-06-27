import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Redirect
} from "@nestjs/common";
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { DisableOAuthGuard, validationPipe } from "@tsg-dsp/common-api";
import {
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  CredentialRequestMessage,
  CredentialStatus,
  IssuerMetadata
} from "@tsg-dsp/common-dtos";
import { CredentialIssuerMetadata } from "@tsg-dsp/wallet-dtos";

import { DCPIssuerService } from "./issuer.service.js";

@Controller("dcp/issuer")
@ApiTags("DCP Credential Issuance")
@DisableOAuthGuard()
export class DCPIssuerController {
  constructor(private readonly issuerService: DCPIssuerService) {}

  @Get("metadata")
  @ApiOperation({
    summary: "Issuer Metadata",
    description: "Returns the metadata of the issuer"
  })
  @ApiOkResponse({ type: CredentialIssuerMetadata })
  @HttpCode(HttpStatus.OK)
  async metadata(): Promise<IssuerMetadata> {
    return this.issuerService.issuerMetadata();
  }

  @Post("credentials")
  @ApiOperation({
    summary: "Request credential",
    description: "Requests a new credential"
  })
  @ApiBody({ type: CredentialRequestMessage })
  @ApiHeader({
    name: "Authorization",
    description: "Self-Issued ID Token",
    required: true,
    schema: {
      type: "string",
      example: "Bearer <token>"
    }
  })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  @Redirect(undefined, HttpStatus.CREATED)
  async credentialRequest(
    @Headers("Authorization") authorizationHeader: string | undefined,
    @Body(validationPipe) credentialRequestMessage: CredentialRequestMessage
  ) {
    return await this.issuerService.handleCredentialRequest(
      authorizationHeader,
      credentialRequestMessage
    );
  }

  @Get("requests/:requestId")
  @ApiOperation({
    summary: "Credential status",
    description: "Returns the status of a credential request"
  })
  @ApiParam({ name: "requestId", required: true, type: String })
  @ApiHeader({
    name: "Authorization",
    description: "Self-Issued ID Token",
    required: true,
    schema: {
      type: "string",
      example: "Bearer <token>"
    }
  })
  @ApiOkResponse({ type: CredentialStatus })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  @HttpCode(HttpStatus.OK)
  async credentialStatus(
    @Headers("Authorization") authorizationHeader: string | undefined,
    @Param("requestId") requestId: string
  ): Promise<CredentialStatus> {
    return await this.issuerService.handleCredentialStatusRequest(
      authorizationHeader,
      requestId
    );
  }
}
