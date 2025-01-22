import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { Roles } from "@tsg-dsp/common-api";
import {
  AppRole,
  CredentialStatusRequest,
  VerifiedCredentialStatus
} from "@tsg-dsp/wallet-dtos";
import { PresentationService } from "./presentation.service.js";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

@Controller("management/presentation")
@ApiTags("Management Presentation")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class PresentationManagementController {
  constructor(private readonly presentationService: PresentationService) {}

  @Post("status")
  @ApiOperation({
    summary: "Get the status of a credential",
    description: "Get the status of a credential"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CredentialStatusRequest })
  @ApiOkResponse({ type: VerifiedCredentialStatus })
  @ApiForbiddenResponseDefault()
  async status(
    @Body() credentialStatusRequest: CredentialStatusRequest
  ): Promise<VerifiedCredentialStatus> {
    return this.presentationService.verifyCredentialStatus(
      credentialStatusRequest.statusListCredential,
      credentialStatusRequest.statusListIndex,
      true
    );
  }
}
