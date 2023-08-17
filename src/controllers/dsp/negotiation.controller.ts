import { Body, Controller, HttpStatus, Logger } from "@nestjs/common";
import { Get, HttpCode, Param, Post } from "@nestjs/common/decorators";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { ContractNegotiationDto } from "../../model/dsp/negotiation/messages.dto";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { NegotiationService } from "../../services/dsp/negotiation.service";
import { DSPError } from "../../utils/errors/error";

@Controller('negotiation')
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe(ContractRequestMessage)) body: ContractRequestMessage): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation request: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleNewRequest(body);
    return result.serialize();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getNegotiation(@Param('id') id: string): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation status request for ${id}`);
    const negotiation = await this.negotiationService.getNegotiation(id);
    if (negotiation) {
      return new ContractNegotiation({
        processId: negotiation.localId,
        contractNegotiationState: negotiation.state
      }).serialize();
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/request')
  @HttpCode(HttpStatus.OK)
  async requestWithId(@Param('id') id: string, @Body(new DeserializePipe(ContractRequestMessage)) body: ContractRequestMessage): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation request for ${id}: ${JSON.stringify(body)}`);
    if (body.processId === undefined || body.processId !== id) {
      throw new DSPError('Missing or mismatch processId field in contract request message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleExistingRequest(id, body);
    return result.serialize();
  }

  @Post(':id/events')
  @HttpCode(HttpStatus.OK)
  async negotiationEvent(@Param('id') id: string, @Body(new DeserializePipe(ContractNegotiationEventMessage)) body: ContractNegotiationEventMessage): Promise<{status: string}> {
    this.logger.log(`Received negotiation event for ${id}: ${JSON.stringify(body)}`);
    if (body.processId !== id) {
      throw new DSPError('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleEvent(id, body);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }
  @Post(':id/agreement/verification')
  @HttpCode(HttpStatus.OK)
  async agreementVerification(@Param('id') id: string, @Body(new DeserializePipe(ContractAgreementVerificationMessage)) body: ContractAgreementVerificationMessage): Promise<{status: string}> {
    this.logger.log(`Received negotiation verification for ${id}: ${JSON.stringify(body)}`);
    if (body.processId !== id) {
      throw new DSPError('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleVerification(id, body);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }
  @Post(':id/termination')
  @HttpCode(HttpStatus.OK)
  async negotiationTermination(@Param('id') id: string, @Body(new DeserializePipe(ContractNegotiationTerminationMessage)) body: ContractNegotiationTerminationMessage): Promise<{status: string}> {
    this.logger.log(`Received negotiation termination for ${id}: ${JSON.stringify(body)}`);
    if (body.processId !== id) {
      throw new DSPError('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
    }
    const result = await this.negotiationService.handleTermination(id, body);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post('callbacks/:id/offer')
  async callbackOffer(@Param('id') id: string, @Body(new DeserializePipe(ContractOfferMessage)) body: ContractOfferMessage): Promise<{status: string}> {
    this.logger.log(`Received negotiation callback offer for ${id}: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleOffer(id, body);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post('callbacks/:id/agreement')
  async callbackAgreement(@Param('id') id: string, @Body(new DeserializePipe(ContractAgreementMessage)) body: ContractAgreementMessage): Promise<{status: string}> {
    this.logger.log(`Received negotiation callback agreement for ${id}: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleAgreement(id, body);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post('callbacks/:id/events')
  async callbackEvent(@Param('id') id: string, @Body(new DeserializePipe(ContractNegotiationEventMessage)) body: ContractNegotiationEventMessage): Promise<{status: string}> {
    this.logger.log(`Received negotiation callback event for ${id}: ${JSON.stringify(body)}`);
    const result = await this.negotiationService.handleEvent(id, body);
    if (result) {
      return {
        status: 'OK'
      }
    } else {
      throw new DSPError('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }
}
