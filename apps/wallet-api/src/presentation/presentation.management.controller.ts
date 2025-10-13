import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiForbiddenResponseDefault,
  CredentialStatusRequest,
  VerifiedCredentialStatus
} from "@tsg-dsp/common-dtos";
import { AddScope, AppRole, ScopeDto } from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";

import { PresentationService } from "./presentation.service.js";

@Controller("management/presentation")
@ApiTags("Management Presentation")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class PresentationManagementController {
  constructor(private readonly presentationService: PresentationService) {}

  @Post("status")
  @ApiOperation({
    summary: "Get the status of a credential",
    description: "Get the status of a credential"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CredentialStatusRequest })
  @ApiOkResponse({ type: VerifiedCredentialStatus })
  @ApiForbiddenResponseDefault()
  async status(
    @Body() credentialStatusRequest: CredentialStatusRequest
  ): Promise<VerifiedCredentialStatus> {
    return this.presentationService.verifyCredentialStatus(
      credentialStatusRequest.statusListCredential,
      credentialStatusRequest.statusListIndex,
      true
    );
  }

  @Get("scopes")
  @UsePagination()
  @ApiOperation({
    summary: "Get all defined scopes",
    description: "Get all defined scopes"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ScopeDto] })
  @ApiForbiddenResponseDefault()
  async getScopes(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<ScopeDto[]>> {
    return this.presentationService.getScopes(paginationOptions);
  }

  @Post("scopes")
  @ApiOperation({
    summary: "Add new scope",
    description: "Add a new scope definition to the wallet"
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: AddScope })
  @ApiOkResponse({ type: ScopeDto })
  @ApiForbiddenResponseDefault()
  async addScope(@Body(validationPipe) scope: AddScope): Promise<ScopeDto> {
    const createdScope = await this.presentationService.addScope(scope);
    return plainToInstance(ScopeDto, createdScope);
  }

  @Put("scopes/:id")
  @ApiOperation({
    summary: "Update scope",
    description: "Update an existing scope definition in the wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AddScope })
  @ApiOkResponse({ type: ScopeDto })
  @ApiForbiddenResponseDefault()
  async updateScope(
    @Body(validationPipe) scope: AddScope,
    id: string
  ): Promise<ScopeDto> {
    const updatedScope = await this.presentationService.updateScope(id, scope);
    return plainToInstance(ScopeDto, updatedScope);
  }

  @Delete("scopes/:id")
  @ApiOperation({
    summary: "Delete scope",
    description: "Delete an existing scope definition from the wallet"
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiForbiddenResponseDefault()
  async deleteScope(id: string): Promise<void> {
    await this.presentationService.deleteScope(id);
  }
}
