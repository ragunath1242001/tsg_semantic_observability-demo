import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Roles,
  UsePagination,
  validationPipe
} from "@tsg-dsp/common-api";
import {
  ApiConflictResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  DIDDocumentDto,
  ServiceDto
} from "@tsg-dsp/common-dtos";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import { DIDDocument } from "did-resolver";

import { DidServiceConfig } from "../config.js";
import { DIDService } from "../model/did.dao.js";
import { DidServiceConfigDto } from "./did.schemas.js";
import { DidService } from "./did.service.js";

@Controller("management/did")
@Roles(AppRole.VIEW_DID)
@ApiTags("Management DID")
@ApiOAuth2([AppRole.VIEW_DID])
export class DIDManagementController {
  constructor(private readonly didService: DidService) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve DID document",
    description: "Retrieves the current DID document for this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DIDDocumentDto })
  @ApiForbiddenResponseDefault()
  async getDidDocument(): Promise<DIDDocument> {
    return await this.didService.getDid();
  }

  @Get("services")
  @UsePagination()
  @ApiOperation({
    summary: "Retrieve DID services",
    description:
      "Retrieves the currently registered DID services for this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ServiceDto] })
  @ApiForbiddenResponseDefault()
  async getServices(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<DIDService[]>> {
    return await this.didService.getPaginatedServices(paginationOptions);
  }

  @Post("services")
  @ApiOperation({
    summary: "Add DID service",
    description: "Registers a new DID service for this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: DidServiceConfigDto })
  @ApiOkResponse({ type: ServiceDto })
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  async addService(
    @Body(validationPipe) service: DidServiceConfig
  ): Promise<DIDService> {
    return await this.didService.insertService(service);
  }

  @Put("services/:id")
  @ApiOperation({
    summary: "Update DID service",
    description: "Updates an existing DID service for this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: DidServiceConfigDto })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async updateService(
    @Param("id") id: string,
    @Body(validationPipe)
    service: DidServiceConfig
  ): Promise<DIDService> {
    return await this.didService.updateService(id, service);
  }

  @Delete("services/:id")
  @ApiOperation({
    summary: "Delete DID service",
    description: "Deletes an existing DID service for this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async deleteService(@Param("id") id: string): Promise<void> {
    return await this.didService.deleteService(id);
  }
}
