import { Controller, Logger, Get, HttpCode, HttpStatus, Post, Body, Param, Query, Headers, Req, Res } from "@nestjs/common";
import { DataPlaneRequestResponseDto } from "../model/data-planes/dataPlanes.dto";
import { TransferRequestMessage, TransferStartMessage, TransferCompletionMessage, TransferTerminationMessage, TransferSuspensionMessage } from "../model/dsp/transfer/messages";
import { DeserializePipe } from "../utils/deserialize.pipe";
import { DataPlaneService } from "./dataplane.service";
import { Request, Response } from "express";

@Controller()
export class DataPlaneTestController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/catalog")
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async getCatalog(){
    return
  }

  @Get("/health")
  @HttpCode(HttpStatus.OK)
  async healthCheck(){
    return
  }

  @Post("/transfer/request/:role")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(@Body(new DeserializePipe(TransferRequestMessage)) body: TransferRequestMessage, @Param('role') role: "provider" | "consumer", @Query("processId") processId: string, @Headers('Authorization') authorization: string): Promise<DataPlaneRequestResponseDto> {
    this.logger.log(`Requesting transfer for ${role} with processId ${processId} and with message: ${JSON.stringify(body)}`);
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    return await this.dataPlaneService.transferRequest(body, role, processId);
  }

  @Post("/transfer/:id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage, @Param('id') id: string, @Headers('Authorization') authorization: string): Promise<void> {
    this.logger.log(`Requesting transfer start for id ${id}, with message:${JSON.stringify(body)}`);
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    return await this.dataPlaneService.transferStart(body, id);
  }

  @Post("/transfer/:id/execute/:version/:path(*)?")
  @HttpCode(HttpStatus.ACCEPTED)
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async executeTransfer(@Param('id') id: string, @Param('version') version: string, @Param('path') path: string | undefined, @Headers('Authorization') authorization: string, @Req() request: Request, @Res() response: Response): Promise<any> {
    this.logger.log(`Requesting transfer execution for id ${id}`);
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    return await this.dataPlaneService.executeProxyRequest(id, version, path || '', request, response);
  }

  @Post("/transfer/:id/complete")
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Body(new DeserializePipe(TransferCompletionMessage)) body: TransferCompletionMessage, @Param('id') id: string, @Headers('Authorization') authorization: string): Promise<void> {
    this.logger.log(`Requesting transfer complete for id ${id}, with message:${JSON.stringify(body)}`);
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    await this.dataPlaneService.transferComplete(body, id);
  }

  @Post("/transfer/:id/terminate")
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(@Body(new DeserializePipe(TransferTerminationMessage)) body: TransferTerminationMessage, @Param('id') id: string, @Headers('Authorization') authorization: string): Promise<void> {
    this.logger.log(`Requesting transfer terminate for id ${id}, with message:${JSON.stringify(body)}`);
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    await this.dataPlaneService.transferTerminate(body, id);
  }

  @Post("/transfer/:id/suspend")
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(@Body(new DeserializePipe(TransferSuspensionMessage)) body: TransferSuspensionMessage, @Param('id') id: string, @Headers('Authorization') authorization: string): Promise<void> {
    this.logger.log(`Requesting transfer suspend for id ${id}, with message:${JSON.stringify(body)}`);
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    await this.dataPlaneService.transferSuspend(body, id);
  }
}
