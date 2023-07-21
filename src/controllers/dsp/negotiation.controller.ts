import { Body, Controller, HttpException, HttpStatus } from "@nestjs/common";
import { Get, HttpCode, Param, Post, Res } from "@nestjs/common/decorators";
import { NegotiationProviderService } from "../../services/negotiationProvider.service";
import { DeserializePipe } from "./deserialize.pipe";
import { LDContractAgreementMessage, LDContractAgreementVerificationMessage, LDContractNegotiation, LDContractNegotiationEventMessage, LDContractNegotiationTerminationMessage, LDContractOfferMessage, LDContractRequestMessage } from "../../model/dsp/negotiation/messages.schema";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { Response } from "express";
import { NegotiationConsumerService } from "../../services/negotiationConsumer.service";

@Controller('negotiation')
export class NegotiationController {
  constructor(private readonly negotiationProviderService: NegotiationProviderService, private readonly negotiationConsumerService: NegotiationConsumerService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe<LDContractRequestMessage, ContractRequestMessage>()) body: ContractRequestMessage, @Res() response: Response): Promise<LDContractNegotiation> {
    if (body instanceof ContractRequestMessage) {
      const result = await this.negotiationProviderService.request(body);
      response.setHeader("Location", `/negotiation/${result.processId}`);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getNegotiation(@Param('id') id: string): Promise<LDContractNegotiation> {
    const contractNegotiation = await this.negotiationProviderService.getNegotiation(id);
    if (contractNegotiation) {
      return contractNegotiation.serialize();
    } else {
      throw new HttpException('Negotiation not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/request')
  @HttpCode(HttpStatus.OK)
  async requestWithId(@Param('id') id: string, @Body(new DeserializePipe<LDContractRequestMessage, ContractRequestMessage>()) body: ContractRequestMessage): Promise<LDContractNegotiation> {
    if (body instanceof ContractRequestMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in contract request message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationProviderService.request(body);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Post(':id/events')
  @HttpCode(HttpStatus.OK)
  async negotiationEvent(@Param('id') id: string, @Body(new DeserializePipe<LDContractNegotiationEventMessage, ContractNegotiationEventMessage>()) body: ContractNegotiationEventMessage): Promise<{status: string}> {
    if (body instanceof ContractNegotiationEventMessage) {
      if (body.processId !== id) {
        throw new HttpException('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationProviderService.negotiationEvent(id, body);
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
  async agreementVerification(@Param('id') id: string, @Body(new DeserializePipe<LDContractAgreementVerificationMessage, ContractAgreementVerificationMessage>()) body: ContractAgreementVerificationMessage): Promise<{status: string}> {
    if (body instanceof ContractAgreementVerificationMessage) {
      if (body.processId !== id) {
        throw new HttpException('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationProviderService.agreementVerification(id, body);
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
  async negotiationTermination(@Param('id') id: string, @Body(new DeserializePipe<LDContractNegotiationTerminationMessage, ContractNegotiationTerminationMessage>()) body: ContractNegotiationTerminationMessage): Promise<{status: string}> {
    if (body instanceof ContractNegotiationTerminationMessage) {
      if (body.processId !== id) {
        throw new HttpException('Mismatch processId field in contract negotiation event message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.negotiationProviderService.negotiationTermination(id, body);
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
  async callbackOffer(@Param('id') id: string, @Body(new DeserializePipe<LDContractOfferMessage, ContractOfferMessage>()) body: ContractOfferMessage): Promise<{status: string}> {
    if (body instanceof ContractOfferMessage) {
      const result = await this.negotiationConsumerService.offerCallback(id, body);
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
  async callbackAgreement(@Param('id') id: string, @Body(new DeserializePipe<LDContractAgreementMessage, ContractAgreementMessage>()) body: ContractAgreementMessage): Promise<{status: string}> {
    if (body instanceof ContractAgreementMessage) {
      const result = await this.negotiationConsumerService.agreementCallback(id, body);
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
  async callbackEvent(@Param('id') id: string, @Body(new DeserializePipe<LDContractNegotiationEventMessage, ContractNegotiationEventMessage>()) body: ContractNegotiationEventMessage): Promise<{status: string}> {
    if (body instanceof ContractNegotiationEventMessage) {
      const result = await this.negotiationConsumerService.eventCallback(id, body);
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
