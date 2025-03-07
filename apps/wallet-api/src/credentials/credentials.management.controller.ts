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
  Query,
  UsePipes
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import { AppError } from "@tsg-dsp/common-api";
import {
  Client,
  DisableOAuthGuard,
  DisableRolesGuard,
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  UsePagination,
  validationPipe
} from "@tsg-dsp/common-api";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  ApiBadRequestResponseDefault,
  ApiConflictResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import { AppRole, ClientInfo } from "@tsg-dsp/wallet-dtos";

import { InitCredentialConfig, RootConfig } from "../config.js";
import { ContextService } from "../contexts/context.service.js";
import { CredentialDao } from "../model/credentials.dao.js";
import {
  CredentialConfigDto,
  CredentialsConfigDto,
  CredentialsDto
} from "./credentials.schemas.js";
import { CredentialsService } from "./credentials.service.js";

@ApiTags("Management Credentials")
@ApiOAuth2([AppRole.VIEW_ALL_CREDENTIALS, AppRole.VIEW_OWN_CREDENTIALS])
@Controller("management/credentials")
export class CredentialsManagementController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly contextService: ContextService,
    private readonly config: RootConfig
  ) {}

  private targetDid(
    action: "view" | "manage",
    client: ClientInfo
  ): string | undefined {
    switch (action) {
      case "view":
        if (client.roles.includes(AppRole.VIEW_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.VIEW_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(
            `Not allowed to view credentials`,
            HttpStatus.FORBIDDEN
          );
        }
      case "manage":
        if (client.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(
            `Not allowed to manage credentials`,
            HttpStatus.FORBIDDEN
          );
        }
    }
  }

  @Get()
  @UsePagination()
  @ApiOperation({
    summary: "List credentials",
    description:
      "List all credentials, that the current user is allowed to view, in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto]
  })
  @ApiForbiddenResponseDefault()
  async getCredentials(
    @Client() client: ClientInfo,
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CredentialDao[]>> {
    const targetDid = this.targetDid("view", client);
    return this.credentialsService.getPaginatedCredentials(
      paginationOptions,
      targetDid
    );
  }

  @Get("/dataspace")
  @ApiOperation({
    summary: "List dataspace credentials",
    description: "List all credentials in this dataspace."
  })
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: "issuerIds",
    required: false,
    description:
      "Comma-separated list of issuer IDs to retrieve dataspace credentials from"
  })
  @ApiOkResponse({
    type: [CredentialsDto]
  })
  @ApiForbiddenResponseDefault()
  async getDataspaceCredentials(
    @Query("issuerIds") issuerIds?: string
  ): Promise<CredentialDao[]> {
    return this.credentialsService.getDataspaceCredentials(issuerIds);
  }

  @Get("config")
  @ApiOperation({
    summary: "Retrieve credential configuration",
    description:
      "Retrieves credential configuration that can be used by this wallet. Contains both trust anchors and JSON-LD contexts."
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: CredentialConfigDto
  })
  @DisableOAuthGuard()
  @DisableRolesGuard()
  @UsePipes(validationPipe)
  async getConfig(): Promise<CredentialsConfigDto> {
    return {
      trustAnchors: this.config.trustAnchors,
      contexts: await this.contextService.getContexts()
    };
  }

  @Post()
  @ApiOperation({
    summary: "Add credential",
    description: "Issue a new credential within this wallet"
  })
  @ApiBody({ type: CredentialConfigDto })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponseDefault()
  @ApiConflictResponseDefault()
  @ApiBadRequestResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async addCredential(
    @Body(validationPipe)
    credentialConfig: InitCredentialConfig,
    @Client() client: ClientInfo
  ): Promise<CredentialDao> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.issueCredential(credentialConfig, targetDid);
  }

  @Post("import")
  @ApiOperation({
    summary: "Import credential",
    description: "Import a credential issued by an external credential issuer"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: VerifiableCredential })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async importCredential(
    @Body() credential: VerifiableCredential,
    @Client() client: ClientInfo
  ): Promise<CredentialDao> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.importCredential(credential, targetDid);
  }

  @Get(":credentialId")
  @ApiOperation({
    summary: "Retrieve credential",
    description: "Retrieve a specific credential within this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async getCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<CredentialsDto> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.getCredential(credentialId, targetDid);
  }

  @Put(":credentialId")
  @ApiOperation({
    summary: "Update credential",
    description:
      "Update a credential within this wallet. __*Note*__: this will either self-issue or import a credential."
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CredentialConfigDto })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async updateCredential(
    @Body(validationPipe)
    credentialConfig: InitCredentialConfig,
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<CredentialDao> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.updateCredential(
      credentialId,
      credentialConfig,
      targetDid
    );
  }

  @Post(":credentialId/revoke")
  @ApiOperation({
    summary: "Revoke credential",
    description: "Revoke credential via BitstringStatusList"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async revokeCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<void> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.revokeCredential(credentialId, targetDid);
  }

  @Delete(":credentialId")
  @ApiOperation({
    summary: "Delete credential",
    description: "Deletes an existing credential within this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async deleteCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<void> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.deleteCredential(credentialId, targetDid);
  }
}
