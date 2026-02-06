import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Requires } from "@tsg-dsp/common-api";
import {
  ITransferHandler,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiForbiddenResponseDefault,
  MetadataDto,
  Resource,
  TransferDto
} from "@tsg-dsp/common-dtos";

import { AnalyticsTransferHandler } from "./analytics-transfer-handler.service.js";

@ApiTags("Data Plane Management")
@Controller("management/transfers")
export class TransfersManagementController {
  constructor(
    @Inject(ITransferHandler)
    private readonly transferHandler: AnalyticsTransferHandler,
    private readonly transferClientService: TransferClientService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @ApiOperation({ summary: "Get all transfers" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransferDto] })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.DP_TRANSFER)
  async getTransfers(): Promise<TransferDto[]> {
    return await this.transferHandler.getTransfers();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.OK, type: TransferDto })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.DP_TRANSFER)
  async getTransfer(@Param("id") id: string): Promise<TransferDto> {
    return await this.transferHandler.getTransferById(id);
  }

  @Get(":id/metadata")
  @ApiOperation({ summary: "Get metadata of transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MetadataDto
  })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.DP_TRANSFER)
  async getMetadata(
    @Param("id") id: string
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    return await this.transferHandler.getMetadata(id);
  }

  @Post(":id/start")
  @ApiOperation({ summary: "Start a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @Requires(Action.EXECUTE, Resource.DP_TRANSFER)
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Param("id") id: string): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferStart(transfer);
  }

  @Post(":id/completion")
  @ApiOperation({ summary: "Complete a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @Requires(Action.EXECUTE, Resource.DP_TRANSFER)
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Param("id") id: string): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferComplete(transfer);
  }

  @Post(":id/termination")
  @ApiOperation({ summary: "Terminate a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiQuery({ name: "reason", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @Requires(Action.EXECUTE, Resource.DP_TRANSFER)
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(
    @Param("id") id: string,
    @Query("code", nonEmptyStringPipe) code: string,
    @Query("reason", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferTerminate(transfer, code, reason);
  }

  @Post(":id/suspension")
  @ApiOperation({ summary: "Suspend a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "reason", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @Requires(Action.EXECUTE, Resource.DP_TRANSFER)
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(
    @Param("id") id: string,
    @Query("reason", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferSuspend(transfer, reason);
  }
}
