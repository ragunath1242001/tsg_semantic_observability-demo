import {
  Controller,
  Logger,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  Query,
  Headers,
  Req,
  Res,
  Body,
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { Request, Response } from "express";
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
    @Headers("Authorization") authorization: string,
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
    @Headers("Authorization") authorization: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting transfer start for id ${id}, with message:${JSON.stringify(body)}`,
    );
    return await this.dataPlaneService.transferStart(body, id);
  }

  @Post("/transfers/:id/execute/:version/:path(*)?")
  @HttpCode(HttpStatus.ACCEPTED)
  async executeTransfer(
    @Param("id") id: string,
    @Param("version") version: string,
    @Param("path") path: string | undefined,
    @Headers("Authorization") authorization: string,
    @Req() request: Request,
    @Res() response: Response,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ): Promise<any> {
    this.logger.log(`Requesting transfer execution for id ${id}`);
    return await this.dataPlaneService.executeProxyRequest(
      id,
      version,
      path || "",
      request,
      response,
    );
  }

  @Post("/transfers/:id/complete")
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(
    @Body() body: TransferCompletionMessageDto,
    @Param("id") id: string,
    @Headers("Authorization") authorization: string,
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
    @Headers("Authorization") authorization: string,
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
    @Headers("Authorization") authorization: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting transfer suspend for id ${id}, with message:${JSON.stringify(body)}`,
    );
    await this.dataPlaneService.transferSuspend(body, id);
  }
}
