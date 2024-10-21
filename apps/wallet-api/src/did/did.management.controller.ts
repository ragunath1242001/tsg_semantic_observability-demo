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
import { AppRole } from "@tsg-dsp/wallet-dtos";
import { DIDService } from "../model/did.dao.js";
import { validationPipe } from "../utils/validation.pipe.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { DidServiceConfigDto } from "./did.schemas.js";
import {
  ApiForbiddenResponseDefault,
  ApiConflictResponseDefault,
  ApiNotFoundResponseDefault,
  DIDDocumentDto,
  ServiceDto,
} from "@tsg-dsp/common-dtos";
import { DidResolverService } from "./did.resolver.service.js";

@Controller("management/did")
@Roles(AppRole.VIEW_DID)
@ApiTags("Management DID")
@ApiOAuth2([AppRole.VIEW_DID])
export class DIDManagementController {
  constructor(
    private readonly didService: DidService,
    private readonly didResolverService: DidResolverService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve DID document",
    description: "Retrieves the current DID document for this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DIDDocumentDto })
  @ApiForbiddenResponseDefault()
  async getDidDocument(): Promise<DIDDocument> {
    return await this.didService.getDid();
  }

  @Get("resolve/:didId")
  @ApiOperation({
    summary: "Resolve DID document",
    description:
      "Resolves the DID identifier from the path parameter into a DID Document",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DIDDocumentDto })
  @ApiForbiddenResponseDefault()
  async resolveDidDocument(
    @Param("didId") didId: string
  ): Promise<DIDDocument> {
    return await this.didResolverService.resolve(didId);
  }

  @Get("services")
  @ApiOperation({
    summary: "Retrieve DID services",
    description:
      "Retrieves the currently registered DID services for this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ServiceDto] })
  @ApiForbiddenResponseDefault()
  async getServices(): Promise<Array<DIDService>> {
    return await this.didService.getServices();
  }

  @Post("services")
  @ApiOperation({
    summary: "Add DID service",
    description: "Registers a new DID service for this wallet",
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
    description: "Updates an existing DID service for this wallet",
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
    description: "Deletes an existing DID service for this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async deleteService(@Param("id") id: string): Promise<void> {
    return await this.didService.deleteService(id);
  }
}
