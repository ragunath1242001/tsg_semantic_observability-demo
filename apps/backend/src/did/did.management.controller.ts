import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  ValidationPipe,
} from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { AppError } from "../utils/error.js";
import { DidService } from "./did.service.js";
import { DIDService } from "../model/credentials.dao.js";
import { DidServiceConfig } from "../config.js";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";

const validationPipe = new ValidationPipe({
  exceptionFactory: (errors) =>
    new AppError(
      {
        message: errors.join(", "),
        errors: errors,
      },
      HttpStatus.BAD_REQUEST
    ),
});

@Controller("management/did")
@Roles(AppRole.VIEW_DID)
export class DIDManagementController {
  constructor(private readonly didService: DidService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getDidDocument(): Promise<DIDDocument> {
    return await this.didService.getDid();
  }

  @Get("services")
  @HttpCode(HttpStatus.OK)
  async getServices(): Promise<Array<DIDService>> {
    return await this.didService.getServices();
  }

  @Post("services")
  @HttpCode(HttpStatus.OK)
  async addService(
    @Body(validationPipe) service: DidServiceConfig
  ): Promise<DIDService> {
    return await this.didService.insertService(service);
  }

  @Put("services/:id")
  @HttpCode(HttpStatus.OK)
  async updateService(
    @Param("id") id: string,
    @Body(validationPipe)
    service: DidServiceConfig
  ): Promise<any> {
    return await this.didService.updateService(id, service);
  }

  @Delete("services/:id")
  @HttpCode(HttpStatus.OK)
  async deleteService(@Param("id") id: string): Promise<void> {
    return await this.didService.deleteService(id);
  }
}
