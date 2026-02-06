import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { CredentialsDto } from "../../credentials/credentials.schemas.js";
import { CredentialDao } from "../../model/credentials.dao.js";
import { OID4VCIHolderService } from "./holder.service.js";

@Controller()
@ApiTags("OpenID 4 Verifiable Credential Issuance")
@Requires(Action.CREATE, Resource.W_CREDENTIAL)
export class OID4VCIHolderController {
  constructor(private readonly holderService: OID4VCIHolderService) {}

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
  ): Promise<CredentialDao[]> {
    return this.holderService.requestCredential({
      issuerUrl,
      preAuthorizedCode,
      authorized
    });
  }
}
