import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  ProjectAgreementFinalizationMessage,
  SignatureRequestMessage,
  SignatureResponseMessage
} from "@tsg-dsp/analytics-data-plane-dtos";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";

import { ProjectAgreementsService } from "./project-agreements.service.js";

@ApiTags("Project Agreements")
@Controller("project-agreements")
@DisableOAuthGuard()
export class ProjectAgreementsController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly projectAgreementsService: ProjectAgreementsService
  ) {}

  @Post("signature-request")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Handle Signature Request Message",
    description:
      "Receives a signature request message from an initiator via transfer."
  })
  @ApiBody({ type: SignatureRequestMessage })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Signature request received successfully"
  })
  async handleSignatureRequestMessage(
    @Body() message: SignatureRequestMessage,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<void> {
    this.logger.log(
      `Handling signature request for project ${message.projectAgreement.id}`
    );
    await this.projectAgreementsService.handleSignatureRequestMessage(
      message,
      authorizationHeader
    );
  }

  @Post("finalization")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Handle Finalization Message",
    description:
      "Receives a finalization message with all signatures via transfer."
  })
  @ApiBody({ type: ProjectAgreementFinalizationMessage })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Finalization message received successfully"
  })
  async handleFinalizationMessage(
    @Body() message: ProjectAgreementFinalizationMessage,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<void> {
    this.logger.log(`Handling finalization for project ${message.projectId}`);
    await this.projectAgreementsService.handleFinalizationMessage(
      message,
      authorizationHeader
    );
  }

  @Post("signature-callback")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Handle Signature Callback",
    description:
      "Receives a signature response callback from a participant at the callback URL."
  })
  @ApiBody({ type: SignatureResponseMessage })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Signature callback received successfully"
  })
  async handleSignatureCallback(
    @Body() message: SignatureResponseMessage,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<void> {
    this.logger.log(
      `Handling signature callback for project ${message.projectId}`
    );
    await this.projectAgreementsService.handleSignatureCallback(
      message,
      authorizationHeader
    );
  }
}
