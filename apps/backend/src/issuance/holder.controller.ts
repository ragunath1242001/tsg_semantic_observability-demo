import { Body, Controller, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";
import { HolderService } from "./holder.service.js";
import { Credentials } from "../model/credentials.dao.js";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CredentialsDto } from "../credentials/credentials.schemas.js";

@Controller()
@ApiTags("OpenID 4 Verifiable Credential Issuance")
@ApiOAuth2([AppRole.MANAGE_OWN_CREDENTIALS, AppRole.MANAGE_ALL_CREDENTIALS])
@Roles([AppRole.MANAGE_OWN_CREDENTIALS, AppRole.MANAGE_ALL_CREDENTIALS])
export class HolderController {
  constructor(private readonly holderService: HolderService) {}

  @Post("oid4vci/holder/request")
  @ApiOkResponse({ type: CredentialsDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  async requestCredential(
    @Body("preAuthorizedCode") preAuthorizedCode: string,
    @Body("issuerUrl") issuerUrl: string
  ): Promise<Credentials> {
    return this.holderService.requestCredential(preAuthorizedCode, issuerUrl);
  }
}
