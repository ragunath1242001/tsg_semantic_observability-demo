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
} from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { DidService } from "./did.service.js";
import { DidServiceConfig } from "../config.js";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";
import { DIDService } from "../model/did.dao.js";
import { validationPipe } from "../utils/validation.pipe.js";
import {
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  DIDDocumentDto,
  DidServiceConfigDto,
  ServiceDto,
} from "./did.schemas.js";

@Controller("management/did")
@Roles(AppRole.VIEW_DID)
@ApiTags("Management DID")
@ApiOAuth2([AppRole.VIEW_DID])
export class DIDManagementController {
  constructor(private readonly didService: DidService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DIDDocumentDto })
  @ApiForbiddenResponse()
  async getDidDocument(): Promise<DIDDocument> {
    return await this.didService.getDid();
  }

  @Get("services")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ServiceDto] })
  @ApiForbiddenResponse()
  async getServices(): Promise<Array<DIDService>> {
    return await this.didService.getServices();
  }

  @Post("services")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: DidServiceConfigDto })
  @ApiOkResponse({ type: ServiceDto })
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  async addService(
    @Body(validationPipe) service: DidServiceConfig
  ): Promise<DIDService> {
    return await this.didService.insertService(service);
  }

  @Put("services/:id")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: DidServiceConfigDto })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async updateService(
    @Param("id") id: string,
    @Body(validationPipe)
    service: DidServiceConfig
  ): Promise<DIDService> {
    return await this.didService.updateService(id, service);
  }

  @Delete("services/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async deleteService(@Param("id") id: string): Promise<void> {
    return await this.didService.deleteService(id);
  }
}
