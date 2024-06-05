import { NegotiationStatusDto } from "@libs/control-plane-dtos";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  AgreementDto,
  ContractNegotiation,
  ContractNegotiationDto,
  NegotiationDetail,
  Offer,
} from "@libs/common-dsp";
import { OAuthGuard } from "../../auth/oauth.guard";
import { Roles } from "../../auth/roles.guard";
import { normalizeAddress } from "../../utils/address";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { NegotiationService } from "./negotiation.service";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/negotiations")
export class NegotiationManagementController {
  constructor(private readonly negotiationService: NegotiationService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  async getNegotiations(): Promise<NegotiationStatusDto[]> {
    return this.negotiationService.getNegotiations();
  }

  @Get(":processId")
  async getNegotiation(
    @Param("processId") processId: string
  ): Promise<NegotiationDetail> {
    const negotiation = await this.negotiationService.getNegotiation(processId);
    return negotiation;
  }

  @Get("agreement/:agreementId")
  async getAgreement(
    @Param("agreementId") agreementId: string
  ): Promise<AgreementDto> {
    return (
      await this.negotiationService.getAgreement(agreementId)
    ).serialize();
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  async requestNewNegotiation(
    @Body(new DeserializePipe(Offer)) body: Offer,
    @Query("dataSet") dataSet: string,
    @Query("address") address: string,
    @Query("audience") audience: string
  ): Promise<ContractNegotiationDto> {
    this.logger.log(
      `Received negotiation request for ${address} with offer ${JSON.stringify(
        body
      )}`
    );
    const controlPlaneAddress = normalizeAddress(
      address,
      1,
      "negotiations",
      "request"
    );
    const negotiationProcess = await this.negotiationService.requestNew(
      body,
      dataSet,
      controlPlaneAddress,
      audience
    );
    return new ContractNegotiation({
      providerPid: negotiationProcess.localId,
      consumerPid: negotiationProcess.remoteId,
      state: negotiationProcess.state,
    }).serialize();
  }

  @Post(":processId/request")
  @HttpCode(HttpStatus.OK)
  async requestExistingNegotiation(
    @Body(new DeserializePipe(Offer)) body: Offer,
    @Param("processId") processId: string
  ): Promise<ContractNegotiationDto> {
    this.logger.log(
      `Received negotiation request for ${processId} with offer ${JSON.stringify(
        body
      )}`
    );
    const negotiationProcess = await this.negotiationService.requestExisting(
      body,
      processId
    );
    return new ContractNegotiation({
      providerPid: negotiationProcess.localId,
      consumerPid: negotiationProcess.remoteId,
      state: negotiationProcess.state,
    }).serialize();
  }

  @Post(":processId/offer")
  @HttpCode(HttpStatus.OK)
  async offer(
    @Body(new DeserializePipe(Offer)) body: Offer,
    @Param("processId") processId: string,
    @Query("address") address?: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation request for ${processId} with offer ${JSON.stringify(
        body
      )}`
    );
    const controlPlaneAddress = address
      ? normalizeAddress(address, 1, "negotiation", "request")
      : undefined;
    const negotiationProcess = await this.negotiationService.offer(
      body,
      processId,
      controlPlaneAddress
    );
    return negotiationProcess;
  }

  @Post(":processId/agreement")
  @HttpCode(HttpStatus.OK)
  async agree(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(`Received negotiation agreement for ${processId}`);
    const negotiationProcess = await this.negotiationService.agree(processId);
    return negotiationProcess;
  }

  @Post(":processId/verify")
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received negotiation agreement verification for ${processId}`
    );
    const negotiationProcess = await this.negotiationService.verify(processId);
    return negotiationProcess;
  }

  @Post(":processId/finalize")
  @HttpCode(HttpStatus.OK)
  async finalize(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(`Received negotiation finalization for ${processId}`);
    const negotiationProcess = await this.negotiationService.finalize(
      processId
    );
    return negotiationProcess;
  }

  @Post(":processId/terminate")
  @HttpCode(HttpStatus.OK)
  async terminate(
    @Param("processId") processId: string,
    @Body() body: { code: string; reason: string }
  ): Promise<{ status: string }> {
    this.logger.log(`Received negotiation termination for ${processId}`);
    const negotiationProcess = await this.negotiationService.terminate(
      processId,
      body.code,
      body.reason
    );
    return negotiationProcess;
  }
}
