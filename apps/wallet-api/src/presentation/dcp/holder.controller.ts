import { Controller, Headers, Post, Body } from "@nestjs/common";
import {
  PresentationQueryMessage,
  PresentationResponseMessage
} from "@tsg-dsp/common-dtos";
import { DCPHolderService } from "./holder.service.js";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { DisableOAuthGuard, validationPipe } from "@tsg-dsp/common-api";

@Controller("dcp/presentations")
@ApiTags("Presentation DCP")
export class DCPHolderController {
  constructor(private readonly holderService: DCPHolderService) {}

  @Post("query")
  @ApiOperation({
    summary: "Retrieve presentation",
    description:
      "Request a presentation with a SIOP-token and a PresentationQueryMessage"
  })
  @ApiBody({ type: () => PresentationQueryMessage })
  @ApiOkResponse({ type: () => PresentationResponseMessage })
  @ApiForbiddenResponseDefault()
  @DisableOAuthGuard()
  async presentationQuery(
    @Body(validationPipe)
    presentationQueryMessage: PresentationQueryMessage,
    @Headers("Authorization") authorizationHeader: string
  ): Promise<PresentationResponseMessage> {
    return await this.holderService.presentationQuery(
      presentationQueryMessage,
      authorizationHeader
    );
  }
}
