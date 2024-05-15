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
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";
import { ContextService } from "./context.service.js";
import { JSONLDContext } from "../model/context.dao.js";
import { JsonLdContextConfig } from "../config.js";
import { AppError } from "../utils/error.js";

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

@Controller("management/contexts")
@Roles(AppRole.VIEW_DID)
export class ContextManagementController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getContexts(): Promise<JSONLDContext[]> {
    return await this.contextService.getContexts();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addContext(
    @Body(validationPipe) service: JsonLdContextConfig
  ): Promise<JSONLDContext> {
    return await this.contextService.insertContext(service);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  async updateContext(
    @Param("id") id: string,
    @Body(validationPipe)
    service: JsonLdContextConfig
  ): Promise<any> {
    return await this.contextService.updateContext(id, service);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deleteContext(@Param("id") id: string): Promise<void> {
    return await this.contextService.deleteContext(id);
  }
}
