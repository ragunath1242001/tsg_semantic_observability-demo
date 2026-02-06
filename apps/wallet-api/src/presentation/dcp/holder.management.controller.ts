import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { nonEmptyStringPipe, Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { SecureTokenService } from "../../keys/token.service.js";

@Controller("management/dcp/holder")
@ApiTags("Presentation DCP")
export class DCPHolderManagementController {
  constructor(private readonly siopService: SecureTokenService) {}

  @Get("token")
  @ApiOperation({
    summary: "Request a SIOP token",
    description:
      "Generates a SIOP token for the provided audience to allow it to request presentations"
  })
  @Requires(Action.READ, Resource.W_PRESENTATION)
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id_token: { type: "string" }
      }
    }
  })
  @ApiForbiddenResponseDefault()
  async createSIToken(
    @Query("audience", nonEmptyStringPipe) audience: string,
    @Query("scope") scope?: string
  ): Promise<{ id_token: string }> {
    return {
      id_token: await this.siopService.createSelfIssuedIDToken({
        audience,
        createAccessToken: true,
        scope
      })
    };
  }
}
