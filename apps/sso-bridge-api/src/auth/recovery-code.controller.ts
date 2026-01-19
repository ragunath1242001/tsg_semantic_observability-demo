import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";

import { RecoveryCodeService } from "./recovery-code.service.js";

@ApiTags("Recovery Codes")
@Controller("auth/recovery-codes")
export class RecoveryCodeController {
  constructor(private readonly recoveryCodeService: RecoveryCodeService) {}

  @Post("regenerate")
  @ApiOperation({
    summary: "Regenerate Recovery Codes",
    description:
      "Generate new recovery codes (requires authentication and 2FA enabled)"
  })
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(@Req() request: Request) {
    return await this.recoveryCodeService.regenerateRecoveryCodes(request);
  }

  @Get("status")
  @ApiOperation({
    summary: "Get Recovery Codes Status",
    description: "Get the count of remaining recovery codes"
  })
  @HttpCode(HttpStatus.OK)
  async getRecoveryCodesStatus(@Req() request: Request) {
    return await this.recoveryCodeService.getRecoveryCodesStatus(request);
  }

  @Post("acknowledge")
  @ApiOperation({
    summary: "Acknowledge Recovery Codes",
    description:
      "Confirm that recovery codes have been saved and complete login"
  })
  @HttpCode(HttpStatus.OK)
  async acknowledgeRecoveryCodes(@Req() request: Request) {
    return await this.recoveryCodeService.acknowledgeRecoveryCodes(request);
  }
}
