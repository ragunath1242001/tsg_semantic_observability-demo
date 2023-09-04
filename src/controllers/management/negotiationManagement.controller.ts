import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Offer } from "../../model/dsp/negotiation/negotiation";
import { DspClientService } from "../../services/dsp/client.service";
import { NegotiationService, NegotiationDetail, NegotiationStatus } from "../../services/dsp/negotiation.service";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { normalizeAddress } from "../../utils/address";
import { DSPError } from "../../utils/errors/error";
import { ManagementGuard } from "../../auth/management.guard";

@UseGuards(ManagementGuard)
@Controller('management/negotiation')
export class NegotiationManagementController {
  constructor(private readonly dsp: DspClientService, private readonly negotiationService: NegotiationService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  async getNegotiations(): Promise<NegotiationStatus[]> {
    return this.negotiationService.getNegotiations();
  }

  @Get(":processId")
  async getNegotiation(@Param("processId") processId: string): Promise<NegotiationDetail> {
    const negotiation = await this.negotiationService.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return negotiation;
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  async requestNewNegotiation(@Body(new DeserializePipe(Offer)) body: Offer, @Query('address') address: string, @Query('audience') audience: string): Promise<NegotiationDetail> {
    this.logger.log(`Received negotiation request for ${address} with offer ${JSON.stringify(body)}`);
    const controlPlaneAddress = normalizeAddress(address, 1, "negotiation", "request");
    const negotiationProcess = await this.negotiationService.requestNew(body, controlPlaneAddress, audience);
    return negotiationProcess;
  }


  @Post(":processId/request")
  @HttpCode(HttpStatus.OK)
  async requestExistingNegotiation(@Body(new DeserializePipe(Offer)) body: Offer, @Param('processId') processId: string): Promise<NegotiationDetail> {
    this.logger.log(`Received negotiation request for ${processId} with offer ${JSON.stringify(body)}`);
    const negotiationProcess = await this.negotiationService.requestExisting(body, processId);
    return negotiationProcess;
  }

  @Post(":processId/offer")
  @HttpCode(HttpStatus.OK)
  async offer(@Body(new DeserializePipe(Offer)) body: Offer, @Param('processId') processId: string, @Query('address') address?: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation request for ${processId} with offer ${JSON.stringify(body)}`);
    const controlPlaneAddress = (address) ? normalizeAddress(address, 1, "negotiation", "request") : undefined;
    const negotiationProcess = await this.negotiationService.offer(body, processId, controlPlaneAddress);
    return negotiationProcess;
  }

  @Post(":processId/agreement")
  @HttpCode(HttpStatus.OK)
  async agree(@Param('processId') processId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation agreement for ${processId}`);
    const negotiationProcess = await this.negotiationService.agree(processId);
    return negotiationProcess;
  }

  @Post(":processId/verify")
  @HttpCode(HttpStatus.OK)
  async verify(@Param('processId') processId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation agreement verification for ${processId}`);
    const negotiationProcess = await this.negotiationService.verify(processId);
    return negotiationProcess;
  }

  @Post(":processId/finalize")
  @HttpCode(HttpStatus.OK)
  async finalize(@Param('processId') processId: string): Promise<{status: string}> {
    this.logger.log(`Received negotiation finalization for ${processId}`);
    const negotiationProcess = await this.negotiationService.finalize(processId);
    return negotiationProcess;
  }

  @Post(":processId/terminate")
  @HttpCode(HttpStatus.OK)
  async terminate(@Param('processId') processId: string, @Body() body: {code: string, reason: string}): Promise<{status: string}> {
    this.logger.log(`Received negotiation termination for ${processId}`);
    const negotiationProcess = await this.negotiationService.terminate(processId, body.code, body.reason);
    return negotiationProcess;
  }


}