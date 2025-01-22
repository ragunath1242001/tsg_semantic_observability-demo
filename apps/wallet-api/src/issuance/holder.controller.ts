import { Body, Controller, Post } from "@nestjs/common";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import { HolderService } from "./holder.service.js";
import { CredentialDao } from "../model/credentials.dao.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { CredentialsDto } from "../credentials/credentials.schemas.js";
import {
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault
} from "@tsg-dsp/common-dtos";
import { Roles } from "@tsg-dsp/common-api";

@Controller()
@ApiTags("OpenID 4 Verifiable Credential Issuance")
@ApiOAuth2([AppRole.MANAGE_OWN_CREDENTIALS, AppRole.MANAGE_ALL_CREDENTIALS])
@Roles([AppRole.MANAGE_OWN_CREDENTIALS, AppRole.MANAGE_ALL_CREDENTIALS])
export class HolderController {
  constructor(private readonly holderService: HolderService) {}

  @Post("oid4vci/holder/request")
  @ApiOperation({
    summary: "Request credential via OID4VCI",
    description:
      "Requests a new credential via the OID4VCI Pre-authorized-code flow."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        issuerUrl: { type: "string" },
        preAuthorizedCode: { type: "string" },
        authorized: {
          type: "object",
          required: ["accessToken", "credentialIdentifier"],
          properties: {
            accessToken: { type: "string" },
            credentialIdentifier: { type: "string" },
            additionalRequestParams: { type: "object" }
          }
        }
      }
    }
  })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  async requestCredential(
    @Body("issuerUrl") issuerUrl: string,
    @Body("preAuthorizedCode") preAuthorizedCode?: string,
    @Body("authorized")
    authorized?: {
      accessToken: string;
      credentialIdentifier: string;
      additionalRequestParams?: { [key: string]: any };
    }
  ): Promise<CredentialDao> {
    return this.holderService.requestCredential({
      issuerUrl,
      preAuthorizedCode,
      authorized
    });
  }
}
