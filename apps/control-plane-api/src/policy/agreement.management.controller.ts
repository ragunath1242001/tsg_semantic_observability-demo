import { UseGuards, Controller, Logger, Get, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import { AgreementService } from "./agreement.service";
import { AgreementDto } from "@tsg-dsp/common-dsp";
import { ContractAgreementMessageSchema } from "../dsp/negotiation/negotiation.schema";

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
    required: true,
  })
  @ApiOkResponse({ type: ContractAgreementMessageSchema })
  async getAgreement(
    @Param("agreementId") agreementId: string
  ): Promise<AgreementDto> {
    return await this.agreementService.getAgreement(agreementId, true);
  }
}
