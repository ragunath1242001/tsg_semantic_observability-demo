import { Controller, Get, Query } from "@nestjs/common";
import { DCPSiopService } from "./siop.service.js";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import {
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";

@Controller("management/dcp/holder")
@ApiTags("Presentation DCP")
export class DCPHolderManagementController {
  constructor(private readonly siopService: DCPSiopService) {}

  @Get("token")
  @ApiOperation({
    summary: "Request a SIOP token",
    description:
      "Generates a SIOP token for the provided audience to allow it to request presentations"
  })
  @Roles(AppRole.VIEW_PRESENTATIONS)
  @ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
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
      id_token: await this.siopService.createSelfIssuedIDToken(
        audience,
        true,
        scope
      )
    };
  }
}
