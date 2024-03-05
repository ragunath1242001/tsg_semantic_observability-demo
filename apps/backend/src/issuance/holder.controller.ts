import { Body, Controller, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";
import { HolderService } from "./holder.service.js";
import { Credentials } from "../model/credentials.dao.js";


@Controller()
@Roles([AppRole.MANAGE_OWN_CREDENTIALS, AppRole.MANAGE_ALL_CREDENTIALS])
export class HolderController {
  constructor(
    private readonly holderService: HolderService
  ){}

  @Post('oid4vci/holder/request')
  async requestCredential(@Body('preAuthorizedCode') preAuthorizedCode: string, @Body('issuerUrl') issuerUrl: string): Promise<Credentials> {
    return this.holderService.requestCredential(preAuthorizedCode, issuerUrl);
  }
}