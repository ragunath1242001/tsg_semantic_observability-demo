import { Controller, Get, Query, Headers } from "@nestjs/common";
import { IatpSiopService } from "./siop.service.js";
import { AppRole } from "@libs/dtos";
import { Roles } from "../../auth/roles.guard.js";
import { PresentationResponse } from "@libs/dtos";
import { IatpHolderService } from "./holder.service.js";
import { DisableOAuthGuard } from "../../auth/oauth.guard.js";

@Controller("iatp/holder")
export class IatpHolderController {
  constructor(
    private readonly siopService: IatpSiopService,
    private readonly holderService: IatpHolderService
  ) {}

  @Get("token")
  @Roles(AppRole.VIEW_PRESENTATIONS)
  async createSIToken(
    @Query("audience") audience: string,
    @Query("scope") scope?: string
  ): Promise<{ id_token: string }> {
    return {
      id_token: await this.siopService.createSelfIssuedIDToken(
        audience,
        true,
        scope
      ),
    };
  }

  @Get("presentation")
  @DisableOAuthGuard()
  async getPresentation(
    @Query("presentation_definition")
    presentationDefinition: string,
    @Headers("Authorization") authorizationHeader: string
  ): Promise<PresentationResponse> {
    return await this.holderService.presentationRequest(
      JSON.parse(presentationDefinition),
      authorizationHeader
    );
  }
}
