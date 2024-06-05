import {
  DataPlaneAddressDto,
  TransferStatusDto,
} from "@libs/control-plane-dtos";
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
import { TransferDetail, TransferProcessDto } from "@libs/common-dsp";
import { OAuthGuard } from "../../auth/oauth.guard";
import { Roles } from "../../auth/roles.guard";
import { normalizeAddress } from "../../utils/address";
import { TransferService } from "./transfer.service";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/transfers")
export class TransferManagementController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  async getTransfers(): Promise<TransferStatusDto[]> {
    const transfers = await this.transferService.getTransfers();
    return Promise.all(
      transfers.map(async (transfer) => {
        return {
          ...transfer,
          process: await transfer.process.serialize(),
          modifiedDate: new Date(),
        };
      })
    );
  }

  @Get(":processId")
  async getTransfer(
    @Param("processId") processId: string
  ): Promise<TransferDetail> {
    const transfer = await this.transferService.getTransfer(processId);
    return transfer;
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(
    @Query("address") address: string,
    @Query("agreementId") agreementId: string,
    @Query("format") format: string,
    @Query("audience") audience: string
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
      format,
      undefined,
      controlPlaneAddress,
      audience
    );
    return internalTransfer.process.serialize();
  }

  @Post(":processId/start")
  @HttpCode(HttpStatus.OK)
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
  async completeTransfer(
    @Param("processId") processId: string
  ): Promise<{ status: string }> {
    this.logger.log(`Received transfer complete for processId ${processId}`);
    return await this.transferService.complete(processId, false);
  }

  @Post(":processId/terminate")
  @HttpCode(HttpStatus.OK)
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
