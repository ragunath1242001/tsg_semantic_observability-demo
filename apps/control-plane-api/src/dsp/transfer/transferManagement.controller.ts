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
  UseGuards
} from "@nestjs/common";
import {
  DataPlaneAddressDto,
  TransferDetail,
  TransferDetailDto,
  TransferProcessDto,
  TransferProcessSchema,
  TransferStatus,
  TransferStatusDto
} from "@tsg-dsp/common-dsp";
import { normalizeAddress } from "../../utils/address.js";
import { TransferService } from "./transfer.service.js";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOAuth2
} from "@nestjs/swagger";
import {
  OAuthGuard,
  Roles,
  UsePagination,
  PaginationQuery,
  PaginationOptionsDto,
  Paginated
} from "@tsg-dsp/common-api";

@ApiTags("Transfers Management")
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/transfers")
export class TransferManagementController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @UsePagination()
  @ApiOperation({ summary: "Get all transfers" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransferStatusDto] })
  async getTransfers(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<TransferStatus[]>> {
    return await this.transferService.getTransfers(paginationOptions);
  }

  @Get(":processId")
  @ApiOperation({ summary: "Get transfer details by process ID" })
  @ApiParam({ name: "processId", required: true, description: "Process ID" })
  @ApiResponse({ status: HttpStatus.OK, type: TransferDetailDto })
  async getTransfer(
    @Param("processId") processId: string
  ): Promise<TransferDetail> {
    const transfer = await this.transferService.getTransfer(processId);
    return transfer;
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a new transfer" })
  @ApiQuery({
    name: "address",
    required: true,
    description: "Control plane address"
  })
  @ApiQuery({
    name: "agreementId",
    required: true,
    description: "Agreement ID"
  })
  @ApiQuery({ name: "format", required: true, description: "Format" })
  @ApiQuery({ name: "audience", required: true, description: "Audience" })
  @ApiResponse({ type: TransferProcessSchema })
  async requestTransfer(
    @Query("address") address: string,
    @Query("agreementId") agreementId: string,
    @Query("audience") audience: string,
    @Query("format") format?: string
  ): Promise<TransferProcessDto> {
    this.logger.log(
      `Received transfer request for ${address} with agreementId ${agreementId} and format ${format}`
    );
    const controlPlaneAddress = normalizeAddress(
      address,
      1,
      "transfers",
      "request"
    );
    const internalTransfer = await this.transferService.initiateTransferProcess(
      agreementId,
      controlPlaneAddress,
      audience,
      format
    );
    return internalTransfer.process.serialize();
  }

  @Post(":processId/start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start a transfer process" })
  @ApiParam({ name: "processId", required: true, description: "Process ID" })
  @ApiBody({ type: DataPlaneAddressDto, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer started successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async startTransfer(
    @Param("processId") processId: string,
    @Body() body?: DataPlaneAddressDto
  ): Promise<{ status: string }> {
    // TODO: Validate body
    this.logger.log(
      `Received transfer start for processId ${processId} with message ${JSON.stringify(
        body
      )}`
    );
    return await this.transferService.start(processId, body, false);
  }

  @Post(":processId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete a transfer process" })
  @ApiParam({ name: "processId", required: true, description: "Process ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer completed successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async completeTransfer(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(`Received transfer complete for processId ${processId}`);
    return await this.transferService.complete(processId, false);
  }

  @Post(":processId/terminate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Terminate a transfer process" })
  @ApiParam({ name: "processId", required: true, description: "Process ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        code: { type: "string" },
        reason: { type: "string" }
      },
      example: { code: "TERMINATION_CODE", reason: "Reason for termination" }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer terminated successfully",
    schema: { type: "object", example: { status: "success" } }
  })
  async terminateTransfer(
    @Param("processId") processId: string,
    @Body() body: { code: string; reason: string }
  ): Promise<{ status: string }> {
    // TODO: Validate body
    this.logger.log(
      `Received transfer terminate for processId ${processId} with code ${body.code} and reason ${body.reason}`
    );
    return await this.transferService.terminate(
      processId,
      body.code,
      body.reason,
      false
    );
  }

  @Post(":processId/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend a transfer process" })
  @ApiParam({ name: "processId", required: true, description: "Process ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      example: { reason: "Reason for suspension" }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer suspended successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async suspendTransfer(
    @Param("processId") processId: string,
    @Body() body: { reason: string }
  ): Promise<{ status: string }> {
    // TODO: Validate body
    this.logger.log(
      `Received transfer suspend for processId ${processId} with reason ${body.reason}`
    );
    return await this.transferService.suspend(processId, body.reason, false);
  }
}
