import {
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
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  MetadataDto,
  TransferDto
} from "@tsg-dsp/common-dtos";

import { TransfersService } from "./transfers.service.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("management/transfers")
@Roles("controlplane_dataplane")
export class TransfersManagementController {
  constructor(private readonly transfersService: TransfersService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @ApiOperation({ summary: "Get all transfers" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransferDto] })
  @ApiForbiddenResponseDefault()
  async getTransfers(): Promise<TransferDto[]> {
    return await this.transfersService.getTransfers();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.OK, type: TransferDto })
  @ApiForbiddenResponseDefault()
  async getTransfer(@Param("id") id: string): Promise<TransferDto> {
    return await this.transfersService.getTransferById(id);
  }

  @Get(":id/metadata")
  @ApiOperation({ summary: "Get metadata of transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MetadataDto
  })
  @ApiForbiddenResponseDefault()
  async getMetadata(
    @Param("id") id: string
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    return await this.transfersService.getMetadata(id);
  }

  @Post(":id/start")
  @ApiOperation({ summary: "Start a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Param("id") id: string): Promise<void> {
    return await this.transfersService.transferStart(id);
  }

  @Post(":id/completion")
  @ApiOperation({ summary: "Complete a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Param("id") id: string): Promise<void> {
    return await this.transfersService.transferComplete(id);
  }

  @Post(":id/termination")
  @ApiOperation({ summary: "Terminate a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiQuery({ name: "reason", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(
    @Param("id") id: string,
    @Query("code", nonEmptyStringPipe) code: string,
    @Query("code", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    return await this.transfersService.transferTerminate(id, code, reason);
  }

  @Post(":id/suspension")
  @ApiOperation({ summary: "Suspend a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(
    @Param("id") id: string,
    @Query("code", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    return await this.transfersService.transferSuspend(id, reason);
  }
}
