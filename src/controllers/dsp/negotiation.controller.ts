import { Body, Controller, HttpException, HttpStatus } from "@nestjs/common";
import { Get, HttpCode, Param, Post, Res } from "@nestjs/common/decorators";
import { DeserializePipe } from "./deserialize.pipe";
import { ContractAgreementMessageDto, ContractAgreementVerificationMessageDto, ContractNegotiationDto, ContractNegotiationEventMessageDto, ContractNegotiationTerminationMessageDto, ContractOfferMessageDto, ContractRequestMessageDto } from "../../model/dsp/negotiation/messages.dto";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { Response } from "express";
import { NegotiationService } from "../../services/dsp/negotiation.service";

@Controller('negotiation')
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe<ContractRequestMessageDto, ContractRequestMessage>()) body: ContractRequestMessage, @Res() response: Response): Promise<ContractNegotiationDto> {
    if (body instanceof ContractRequestMessage) {
      const result = await this.negotiationService.handleRequest(body);
      response.setHeader("Location", `/negotiation/${result.processId}`);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getNegotiation(@Param('id') id: string): Promise<ContractNegotiationDto> {
    const negotiation = await this.negotiationService.getNegotiation(id);
    if (negotiation) {
      return new ContractNegotiation({
        processId: negotiation.localId,
        contractNegotiationState: negotiation.state
      }).serialize();
    } else {
      throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/request')
  @HttpCode(HttpStatus.OK)
  async requestWithId(@Param('id') id: string, @Body(new DeserializePipe<ContractRequestMessageDto, ContractRequestMessage>()) body: ContractRequestMessage): Promise<ContractNegotiationDto> {
    if (body instanceof ContractRequestMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in contract request message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationService.handleExistingRequest(id, body);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Post(':id/events')
  @HttpCode(HttpStatus.OK)
  async negotiationEvent(@Param('id') id: string, @Body(new DeserializePipe<ContractNegotiationEventMessageDto, ContractNegotiationEventMessage>()) body: ContractNegotiationEventMessage): Promise<{status: string}> {
    if (body instanceof ContractNegotiationEventMessage) {
      if (body.processId !== id) {
        throw new HttpException('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationService.handleEvent(id, body);
      if (result) {
        return {
          status: 'OK'
        }
      } else {
        throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
      }
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  @Post(':id/agreement/verification')
  @HttpCode(HttpStatus.OK)
  async agreementVerification(@Param('id') id: string, @Body(new DeserializePipe<ContractAgreementVerificationMessageDto, ContractAgreementVerificationMessage>()) body: ContractAgreementVerificationMessage): Promise<{status: string}> {
    if (body instanceof ContractAgreementVerificationMessage) {
      if (body.processId !== id) {
        throw new HttpException('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationService.handleVerification(id, body);
      if (result) {
        return {
          status: 'OK'
        }
      } else {
        throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
      }
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  @Post(':id/termination')
  @HttpCode(HttpStatus.OK)
  async negotiationTermination(@Param('id') id: string, @Body(new DeserializePipe<ContractNegotiationTerminationMessageDto, ContractNegotiationTerminationMessage>()) body: ContractNegotiationTerminationMessage): Promise<{status: string}> {
    if (body instanceof ContractNegotiationTerminationMessage) {
      if (body.processId !== id) {
        throw new HttpException('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationService.handleTermination(id, body);
      if (result) {
        return {
          status: 'OK'
        }
      } else {
        throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
      }
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Post('callbacks/:id/offer')
  async callbackOffer(@Param('id') id: string, @Body(new DeserializePipe<ContractOfferMessageDto, ContractOfferMessage>()) body: ContractOfferMessage): Promise<{status: string}> {
    if (body instanceof ContractOfferMessage) {
      const result = await this.negotiationService.handleOffer(id, body);
      if (result) {
        return {
          status: 'OK'
        }
      } else {
        throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
      }
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Post('callbacks/:id/agreement')
  async callbackAgreement(@Param('id') id: string, @Body(new DeserializePipe<ContractAgreementMessageDto, ContractAgreementMessage>()) body: ContractAgreementMessage): Promise<{status: string}> {
    if (body instanceof ContractAgreementMessage) {
      const result = await this.negotiationService.handleAgreement(id, body);
      if (result) {
        return {
          status: 'OK'
        }
      } else {
        throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
      }
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
    
  }

  @Post('callbacks/:id/events')
  async callbackEvent(@Param('id') id: string, @Body(new DeserializePipe<ContractNegotiationEventMessageDto, ContractNegotiationEventMessage>()) body: ContractNegotiationEventMessage): Promise<{status: string}> {
    if (body instanceof ContractNegotiationEventMessage) {
      const result = await this.negotiationService.handleEvent(id, body);
      if (result) {
        return {
          status: 'OK'
        }
      } else {
        throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
      }
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
    
  }
}
