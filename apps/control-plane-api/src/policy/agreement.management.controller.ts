import { UseGuards, Controller, Logger, Get, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam
} from "@nestjs/swagger";
import { OAuthGuard } from "../auth/oauth.guard.js";
import { Roles } from "../auth/roles.guard.js";
import { AgreementService } from "./agreement.service.js";
import { AgreementDto, AgreementSchema } from "@tsg-dsp/common-dsp";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin"])
@Controller("management/agreements")
@ApiTags("Agreement")
@ApiOAuth2(["controlplane_admin"])
export class AgreementManagementController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly agreementService: AgreementService) {}

  @Get(":agreementId")
  @ApiOperation({ summary: "Get an agreement by agreement ID" })
  @ApiParam({
    name: "agreementId",
    description: "Agreement ID",
    required: true
  })
  @ApiOkResponse({ type: AgreementSchema })
  async getAgreement(
    @Param("agreementId") agreementId: string
  ): Promise<AgreementDto> {
    return await this.agreementService.getAgreement(agreementId, true);
  }
}
