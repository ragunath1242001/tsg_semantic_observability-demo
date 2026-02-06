import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import {
  ContractAgreementMessage,
  ContractAgreementMessageSchema,
  ContractAgreementVerificationMessage,
  ContractAgreementVerificationMessageSchema,
  ContractNegotiation,
  ContractNegotiationDto,
  ContractNegotiationEventMessage,
  ContractNegotiationEventMessageSchema,
  ContractNegotiationSchema,
  ContractNegotiationTerminationMessage,
  ContractNegotiationTerminationMessageSchema,
  ContractOfferMessage,
  ContractOfferMessageSchema,
  ContractRequestMessage,
  ContractRequestMessageSchema
} from "@tsg-dsp/common-dsp";

import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { DSPError } from "../../utils/errors/error.js";
import { VerifiablePresentationGuard } from "../../vc-auth/verifiablePresentation.guard.js";
import { VPId } from "../../vc-auth/vp.decorators.js";
import { NegotiationService } from "./negotiation.service.js";

@ApiBearerAuth()
@ApiTags("Negotiations")
@UseGuards(VerifiablePresentationGuard)
@DisableOAuthGuard()
@Controller()
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}
  private readonly logger = new Logger(this.constructor.name);

  @ApiOperation({ summary: "Request a new negotiation" })
  @ApiBody({ type: ContractRequestMessageSchema })
  @ApiCreatedResponse({
    type: ContractNegotiationSchema
  })
  @Post("negotiations/request")
  @HttpCode(HttpStatus.CREATED)
  async request(
    @Body(new DeserializePipe(ContractRequestMessage))
    body: ContractRequestMessage,
    @VPId() vpId: string
  ): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation request: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleNewRequest(body, vpId);
    return result.serialize();
  }

  @ApiOperation({ summary: "Get negotiation status by ID" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: ContractNegotiationSchema })
  @Get("negotiations/:id")
  @HttpCode(HttpStatus.OK)
  async getNegotiation(
    @Param("id") id: string,
    @VPId() vpId: string
  ): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation status request for ${id}`);
    const negotiation = await this.negotiationService.getNegotiation(id, vpId);
    return new ContractNegotiation({
      providerPid: negotiation.id,
      consumerPid: negotiation.remoteId,
      state: negotiation.state
    }).serialize();
  }

  @ApiOperation({ summary: "Request negotiation with ID" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractRequestMessageSchema })
  @ApiOkResponse({
    type: ContractNegotiationSchema
  })
  @Post("negotiations/:id/request")
  @HttpCode(HttpStatus.OK)
  async requestWithId(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractRequestMessage))
    body: ContractRequestMessage,
    @VPId() vpId: string
  ): Promise<ContractNegotiationDto> {
    this.logger.log(
      `Received negotiation request for ${id}: ${JSON.stringify(body)}`
    );
    if (body.providerPid === undefined || body.providerPid !== id) {
      throw new DSPError(
        "Missing or mismatch providerPid field in contract request message",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    const result = await this.negotiationService.handleExistingRequest(
      id,
      body,
      vpId
    );
    return result.serialize();
  }

  @ApiOperation({ summary: "Handle negotiation event" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractNegotiationEventMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("negotiations/:id/events")
  @HttpCode(HttpStatus.OK)
  async negotiationEvent(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractNegotiationEventMessage))
    body: ContractNegotiationEventMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation event for ${id}: ${JSON.stringify(body)}`
    );
    if (body.providerPid !== id) {
      throw new DSPError(
        "Mismatch providerPid field in contract negotiation event message",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    const result = await this.negotiationService.handleEvent(id, body, vpId);
    return result;
  }

  @ApiOperation({ summary: "Verify agreement" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractAgreementVerificationMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("negotiations/:id/agreement/verification")
  @HttpCode(HttpStatus.OK)
  async agreementVerification(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractAgreementVerificationMessage))
    body: ContractAgreementVerificationMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation verification for ${id}: ${JSON.stringify(body)}`
    );
    if (body.providerPid !== id) {
      throw new DSPError(
        "Mismatch providerPid field in contract negotiation event message",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    const result = await this.negotiationService.handleVerification(
      id,
      body,
      vpId
    );

    return result;
  }

  @ApiOperation({ summary: "Terminate negotiation" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractNegotiationTerminationMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("negotiations/:id/termination")
  @HttpCode(HttpStatus.OK)
  async negotiationTermination(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractNegotiationTerminationMessage))
    body: ContractNegotiationTerminationMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation termination for ${id}: ${JSON.stringify(body)}`
    );
    if (body.providerPid !== id) {
      throw new DSPError(
        "Mismatch providerPid field in contract negotiation event message",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    const result = await this.negotiationService.handleTermination(
      id,
      body,
      vpId
    );
    return result;
  }

  @ApiOperation({ summary: "Handle negotiation callback status" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: ContractNegotiationSchema })
  @Get("callbacks/negotiations/:id")
  async callbackStatus(
    @Param("id") id: string,
    @VPId() vpId: string
  ): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation callback status request for ${id}`);
    const negotiation = await this.negotiationService.getNegotiation(id, vpId);
    return new ContractNegotiation({
      providerPid: negotiation.id,
      consumerPid: negotiation.remoteId,
      state: negotiation.state
    }).serialize();
  }

  @ApiOperation({ summary: "Handle negotiation callback offer" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractOfferMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("callbacks/negotiations/:id/offers")
  async callbackOffer(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractOfferMessage)) body: ContractOfferMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation callback offer for ${id}: ${JSON.stringify(body)}`
    );
    const result = await this.negotiationService.handleOffer(id, body, vpId);
    return result;
  }

  @ApiOperation({ summary: "Handle negotiation callback agreement" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractAgreementMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("callbacks/negotiations/:id/agreement")
  async callbackAgreement(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractAgreementMessage))
    body: ContractAgreementMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation callback agreement for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.negotiationService.handleAgreement(
      id,
      body,
      vpId
    );
    return result;
  }

  @ApiOperation({ summary: "Handle negotiation callback event" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractNegotiationEventMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("callbacks/negotiations/:id/events")
  async callbackEvent(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractNegotiationEventMessage))
    body: ContractNegotiationEventMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation callback event for ${id}: ${JSON.stringify(body)}`
    );
    const result = await this.negotiationService.handleEvent(id, body, vpId);
    return result;
  }
  @ApiOperation({ summary: "Handle negotiation callback termination" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractNegotiationEventMessageSchema })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  @Post("callbacks/negotiations/:id/termination")
  async callbackTermination(
    @Param("id") id: string,
    @Body(new DeserializePipe(ContractNegotiationTerminationMessage))
    body: ContractNegotiationTerminationMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation callback termination for ${id}: ${JSON.stringify(body)}`
    );
    const result = await this.negotiationService.handleTermination(
      id,
      body,
      vpId
    );
    return result;
  }
}
