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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import {
  Client,
  ClientInfo,
  DisableAbac,
  DisableOAuthGuard,
  EffectiveScope,
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Requires,
  UsePagination,
  validationPipe
} from "@tsg-dsp/common-api";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiConflictResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { InitCredentialConfig, RootConfig } from "../config.js";
import { IssueConfigurationService } from "../issue-configurations/issue-configuration.service.js";
import { CredentialDao } from "../model/credentials.dao.js";
import {
  CredentialConfigDto,
  CredentialsConfigDto,
  CredentialsDto
} from "./credentials.schemas.js";
import { CredentialsService } from "./credentials.service.js";

function scopeToTargetDid(
  scope: EffectiveScope,
  clientDidId?: string
): string | undefined {
  if (scope === "*" || scope === null) {
    return undefined;
  }
  return clientDidId;
}

@ApiTags("Management Credentials")
@Requires(Action.READ, Resource.W_CREDENTIAL)
@Controller("management/credentials")
export class CredentialsManagementController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly issueConfigurationService: IssueConfigurationService,
    private readonly config: RootConfig
  ) {}

  @Get()
  @UsePagination()
  @ApiOperation({
    summary: "List credentials",
    description:
      "List all credentials, that the current user is allowed to view, in this wallet"
  })
  @DisableOAuthGuard()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto]
  })
  @ApiForbiddenResponseDefault()
  async getCredentials(
    @Client() client: ClientInfo,
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CredentialDao[]>> {
    if (!client) {
      return this.credentialsService.getPaginatedCredentialsPublic(
        paginationOptions
      );
    }
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.READ, Resource.W_CREDENTIAL),
      client.didId
    );
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
      "Retrieves credential configuration that can be used by this wallet. Contains both trust anchors and issue configurations."
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: CredentialConfigDto
  })
  @DisableOAuthGuard()
  @DisableAbac
  @UsePipes(validationPipe)
  async getConfig(): Promise<CredentialsConfigDto> {
    return {
      trustAnchors: this.config.trustAnchors,
      issueConfigurations:
        await this.issueConfigurationService.getIssueConfigurations()
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
  @Requires(Action.CREATE, Resource.W_CREDENTIAL)
  @HttpCode(HttpStatus.OK)
  async addCredential(
    @Body(validationPipe)
    credentialConfig: InitCredentialConfig,
    @Client() client: ClientInfo
  ): Promise<CredentialDao> {
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.CREATE, Resource.W_CREDENTIAL),
      client.didId
    );
    return this.credentialsService.issueCredential(
      credentialConfig,
      targetDid,
      client
    );
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
  @Requires(Action.CREATE, Resource.W_CREDENTIAL)
  async importCredential(
    @Body() credential: VerifiableCredential,
    @Client() client: ClientInfo
  ): Promise<CredentialDao> {
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.CREATE, Resource.W_CREDENTIAL),
      client.didId
    );
    return this.credentialsService.importCredential(
      credential,
      targetDid,
      client
    );
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
  @Requires(Action.READ, Resource.W_CREDENTIAL)
  async getCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<CredentialsDto> {
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.READ, Resource.W_CREDENTIAL),
      client.didId
    );
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
  @Requires(Action.UPDATE, Resource.W_CREDENTIAL)
  async updateCredential(
    @Body(validationPipe)
    credentialConfig: InitCredentialConfig,
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<CredentialDao> {
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.UPDATE, Resource.W_CREDENTIAL),
      client.didId
    );
    return this.credentialsService.updateCredential(
      credentialId,
      credentialConfig,
      targetDid,
      client
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
  @Requires(Action.UPDATE, Resource.W_CREDENTIAL)
  async revokeCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<void> {
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.UPDATE, Resource.W_CREDENTIAL),
      client.didId
    );
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
  @Requires(Action.DELETE, Resource.W_CREDENTIAL)
  async deleteCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<void> {
    const targetDid = scopeToTargetDid(
      client.getEffectiveScope(Action.DELETE, Resource.W_CREDENTIAL),
      client.didId
    );
    return this.credentialsService.deleteCredential(credentialId, targetDid);
  }
}
