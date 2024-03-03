import { Body, Controller, HttpStatus, Logger } from "@nestjs/common";
import { Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common/decorators";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { ContractNegotiationDto } from "@tsg-dsp/common";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { NegotiationService } from "./negotiation.service";
import { DSPError } from "../../utils/errors/error";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard";
import { VPId } from "../../auth/verifiablePresentation.strategy";
import { NegotiationGateway } from "./negotiation.gateway";

@UseGuards(VerifiablePresentationGuard)
@Controller('negotiations')
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService, private readonly negotiationGateway: NegotiationGateway) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe(ContractRequestMessage)) body: ContractRequestMessage, @VPId() vpId: string): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation request: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleNewRequest(body, vpId);
    this.negotiationGateway.sendUpdateToClients("negotiation:create", "created")
    return result.serialize();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getNegotiation(@Param('id') id: string, @VPId() vpId: string): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation status request for ${id}`);
    const negotiation = await this.negotiationService.getNegotiation(id, vpId);
    return new ContractNegotiation({
      providerPid: negotiation.localId,
      consumerPid: negotiation.remoteId,
      state: negotiation.state
    }).serialize();
  }

  @Post(':id/request')
  @HttpCode(HttpStatus.OK)
  async requestWithId(@Param('id') id: string, @Body(new DeserializePipe(ContractRequestMessage)) body: ContractRequestMessage, @VPId() vpId: string): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation request for ${id}: ${JSON.stringify(body)}`);
    if (body.providerPid === undefined || body.providerPid !== id) {
      throw new DSPError('Missing or mismatch providerPid field in contract request message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleExistingRequest(id, body, vpId);
    this.negotiationGateway.sendUpdateToClients("negotiation:update", "updated")
    return result.serialize();
  }

  @Post(':id/events')
  @HttpCode(HttpStatus.OK)
  async negotiationEvent(@Param('id') id: string, @Body(new DeserializePipe(ContractNegotiationEventMessage)) body: ContractNegotiationEventMessage, @VPId() vpId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation event for ${id}: ${JSON.stringify(body)}`);
    if (body.providerPid !== id) {
      throw new DSPError('Mismatch providerPid field in contract negotiation event message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleEvent(id, body, vpId);
    if (result) {
      this.negotiationGateway.sendUpdateToClients("negotiation:update", "updated")
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }
  @Post(':id/agreement/verification')
  @HttpCode(HttpStatus.OK)
  async agreementVerification(@Param('id') id: string, @Body(new DeserializePipe(ContractAgreementVerificationMessage)) body: ContractAgreementVerificationMessage, @VPId() vpId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation verification for ${id}: ${JSON.stringify(body)}`);
    if (body.providerPid !== id) {
      throw new DSPError('Mismatch providerPid field in contract negotiation event message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleVerification(id, body, vpId);
    if (result) {
      this.negotiationGateway.sendUpdateToClients("negotiation:update", "updated")
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }
  @Post(':id/termination')
  @HttpCode(HttpStatus.OK)
  async negotiationTermination(@Param('id') id: string, @Body(new DeserializePipe(ContractNegotiationTerminationMessage)) body: ContractNegotiationTerminationMessage, @VPId() vpId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation termination for ${id}: ${JSON.stringify(body)}`);
    if (body.providerPid !== id) {
      throw new DSPError('Mismatch providerPid field in contract negotiation event message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleTermination(id, body, vpId);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post('callbacks/:id/offer')
  async callbackOffer(@Param('id') id: string, @Body(new DeserializePipe(ContractOfferMessage)) body: ContractOfferMessage, @VPId() vpId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation callback offer for ${id}: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleOffer(id, body, vpId);
    if (result) {
      this.negotiationGateway.sendUpdateToClients("negotiation:update", "updated")
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post('callbacks/:id/agreement')
  async callbackAgreement(@Param('id') id: string, @Body(new DeserializePipe(ContractAgreementMessage)) body: ContractAgreementMessage, @VPId() vpId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation callback agreement for ${id}: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleAgreement(id, body, vpId);
    if (result) {
      this.negotiationGateway.sendUpdateToClients("negotiation:update", "updated")
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post('callbacks/:id/events')
  async callbackEvent(@Param('id') id: string, @Body(new DeserializePipe(ContractNegotiationEventMessage)) body: ContractNegotiationEventMessage, @VPId() vpId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation callback event for ${id}: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleEvent(id, body, vpId);
    if (result) {
      this.negotiationGateway.sendUpdateToClients("negotiation:update", "updated")
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }
}
