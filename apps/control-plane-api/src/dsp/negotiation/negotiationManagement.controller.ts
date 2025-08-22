import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  nonEmptyStringPipe,
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Roles,
  UsePagination
} from "@tsg-dsp/common-api";
import {
  ContractNegotiation,
  ContractNegotiationDto,
  ContractNegotiationSchema,
  Offer,
  OfferSchema
} from "@tsg-dsp/common-dsp";
import {
  NegotiationDetailDto,
  NegotiationStatusDto
} from "@tsg-dsp/common-dtos";

import { normalizeAddress } from "../../utils/address.js";
import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { NegotiationService } from "./negotiation.service.js";

@ApiTags("Negotiations Management")
@Roles(["controlplane_admin", "controlplane_dataplane"])
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/negotiations")
export class NegotiationManagementController {
  constructor(private readonly negotiationService: NegotiationService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @Roles(["controlplane_admin", "controlplane_dataplane", "readonly_user"])
  @UsePagination()
  @ApiOperation({ summary: "Get all negotiations" })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched negotiations",
    type: [NegotiationStatusDto]
  })
  async getNegotiations(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<NegotiationStatusDto[]>> {
    return this.negotiationService.getNegotiations(paginationOptions);
  }

  @Get("/dataset/:datasetId")
  @Roles(["controlplane_admin", "controlplane_dataplane", "readonly_user"])
  @ApiOperation({ summary: "Get all negotiations for a dataset" })
  @ApiParam({
    name: "datasetId",
    description: "Dataset ID you want to find a negotiation for",
    required: true
  })
  @ApiQuery({
    name: "remoteParty",
    description: "Remote party you want a negotiation to find for",
    required: false
  })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched negotiations",
    type: [NegotiationStatusDto]
  })
  async getNegotiationsFromDatasetId(
    @Param("datasetId") datasetId: string,
    @Query("remoteParty") remoteParty?: string
  ): Promise<NegotiationDetailDto> {
    return this.negotiationService.getNegotiationFromDataSetId(
      datasetId,
      remoteParty
    );
  }

  @Get(":processId")
  @Roles(["controlplane_admin", "controlplane_dataplane", "readonly_user"])
  @ApiOperation({ summary: "Get a negotiation by process ID" })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched negotiation",
    type: NegotiationDetailDto
  })
  async getNegotiation(
    @Param("processId") processId: string
  ): Promise<NegotiationDetailDto> {
    const negotiation =
      await this.negotiationService.getNegotiationDto(processId);
    return negotiation;
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a new negotiation" })
  @ApiBody({ description: "Offer details", type: OfferSchema })
  @ApiQuery({
    name: "dataSet",
    description: "Dataset for the negotiation",
    required: true
  })
  @ApiQuery({
    name: "address",
    description: "Address for the negotiation",
    required: true
  })
  @ApiQuery({
    name: "audience",
    description: "Audience for the negotiation",
    required: true
  })
  @ApiOkResponse({ type: ContractNegotiationSchema })
  async requestNewNegotiation(
    @Body(new DeserializePipe(Offer)) body: Offer,
    @Query("dataSet", nonEmptyStringPipe) dataSet: string,
    @Query("address", nonEmptyStringPipe) address: string,
    @Query("audience", nonEmptyStringPipe) audience: string
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
      state: negotiationProcess.state
    }).serialize();
  }

  @Post(":processId/request")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request an existing negotiation" })
  @ApiBody({ description: "Offer details", type: OfferSchema })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiOkResponse({ type: ContractNegotiationSchema })
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
      state: negotiationProcess.state
    }).serialize();
  }

  @Post(":processId/offers")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit an offer for an existing negotiation" })
  @ApiBody({ description: "Offer details", type: OfferSchema })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiQuery({
    name: "address",
    description: "Address for the negotiation",
    required: false
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
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
  @ApiOperation({ summary: "Agree to a negotiation" })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  async agree(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(`Received negotiation agreement for ${processId}`);
    const negotiationProcess = await this.negotiationService.agree(processId);
    return negotiationProcess;
  }

  @Post(":processId/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a negotiation agreement" })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
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
  @ApiOperation({ summary: "Finalize a negotiation" })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
  async finalize(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(`Received negotiation finalization for ${processId}`);
    const negotiationProcess =
      await this.negotiationService.finalize(processId);
    return negotiationProcess;
  }

  @Post(":processId/termination")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Terminate a negotiation" })
  @ApiParam({
    name: "processId",
    description: "Process ID of the negotiation",
    required: true
  })
  @ApiBody({
    description: "Termination details",
    schema: { example: { code: "string", reason: "string" } }
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "string" }
    }
  })
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
