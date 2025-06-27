import { Body, Controller, Headers, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { DisableOAuthGuard, validationPipe } from "@tsg-dsp/common-api";
import {
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault,
  CredentialMessage,
  CredentialOfferMessage
} from "@tsg-dsp/common-dtos";

import { DCPHolderService } from "./holder.service.js";

@Controller("dcp")
@ApiTags("DCP Credential Issuance")
@DisableOAuthGuard()
export class DCPHolderController {
  constructor(private readonly holderService: DCPHolderService) {}

  @Post("credentials")
  @ApiOperation({
    summary: "Store credential",
    description: "Stores a new credential"
  })
  @ApiBody({ type: CredentialMessage })
  @ApiHeader({
    name: "Authorization",
    description: "Access Token from Self-Issued ID Token",
    required: true,
    schema: {
      type: "string",
      example: "Bearer <token>"
    }
  })
  @ApiOkResponse()
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  async storeCredential(
    @Headers("Authorization") authorizationHeader: string | undefined,
    @Body(validationPipe) credentialMessage: CredentialMessage
  ): Promise<void> {
    return await this.holderService.handleCredentialMessage(
      authorizationHeader,
      credentialMessage
    );
  }

  @Post("offers")
  @ApiOperation({
    summary: "Offer credential",
    description: "Offers a new or updated credential"
  })
  @ApiBody({ type: CredentialOfferMessage })
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
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  async credentialOffer(
    @Headers("Authorization") authorizationHeader: string | undefined,
    @Body(validationPipe) credentialOffer: CredentialOfferMessage
  ): Promise<void> {
    return await this.holderService.handleCredentialOfferMessage(
      authorizationHeader,
      credentialOffer
    );
  }
}
