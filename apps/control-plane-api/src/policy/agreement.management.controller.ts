import { Controller, Get, Logger, Param } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { Requires } from "@tsg-dsp/common-api";
import { AgreementDto, AgreementSchema } from "@tsg-dsp/common-dsp";
import { Action, Resource } from "@tsg-dsp/common-dtos";

import { AgreementService } from "./agreement.service.js";

@Requires(Action.READ, Resource.CP_AGREEMENT)
@Controller("management/agreements")
@ApiTags("Agreement")
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
