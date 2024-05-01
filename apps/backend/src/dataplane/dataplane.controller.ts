import {
  Controller,
  Logger,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import {
  DataPlaneRequestResponseDto,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto,
} from "@tsg-dsp/common";
import { DisableOAuthGuard } from "../auth/oauth.guard";
import { DisableRolesGuard, Roles } from "../auth/roles.guard";

@Controller()
@Roles("controlplane_dataplane")
export class DataPlaneController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/catalog")
  @Roles("wallet_manage_clients")
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async getCatalog() {
    return;
  }

  @Get([
    "/health",
    ...(process.env["EMBEDDED_FRONTEND"] ? ["/api/health"] : []),
  ])
  @DisableOAuthGuard()
  @DisableRolesGuard()
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return;
  }

  @Post("/transfers/request/:role")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(
    @Body() body: TransferRequestMessageDto,
    @Param("role") role: "provider" | "consumer",
    @Query("processId") processId: string,
  ): Promise<DataPlaneRequestResponseDto> {
    this.logger.log(
      `Requesting transfer for ${role} with processId ${processId} and with message: ${JSON.stringify(body)}`,
    );
    return await this.dataPlaneService.transferRequest(body, role, processId);
  }

  @Post("/transfers/:id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(
    @Body() body: TransferStartMessageDto,
    @Param("id") id: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting transfer start for id ${id}, with message:${JSON.stringify(body)}`,
    );
    return await this.dataPlaneService.transferStart(body, id);
  }

  @Post("/transfers/:id/complete")
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(
    @Body() body: TransferCompletionMessageDto,
    @Param("id") id: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting transfer complete for id ${id}, with message:${JSON.stringify(body)}`,
    );
    await this.dataPlaneService.transferComplete(body, id);
  }

  @Post("/transfers/:id/terminate")
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(
    @Body() body: TransferTerminationMessageDto,
    @Param("id") id: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting transfer terminate for id ${id}, with message:${JSON.stringify(body)}`,
    );
    await this.dataPlaneService.transferTerminate(body, id);
  }

  @Post("/transfers/:id/suspend")
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(
    @Body() body: TransferSuspensionMessageDto,
    @Param("id") id: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting transfer suspend for id ${id}, with message:${JSON.stringify(body)}`,
    );
    await this.dataPlaneService.transferSuspend(body, id);
  }
}
