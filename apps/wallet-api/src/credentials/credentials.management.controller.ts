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
  UsePipes,
} from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { InitCredentialConfig, RootConfig } from "../config.js";
import { Credentials } from "../model/credentials.dao.js";
import { CredentialSubject, VerifiableCredential } from "@libs/common-dsp";
import { Client } from "../auth/roles.guard.js";
import { AppError } from "../utils/error.js";
import { ClientInfo, AppRole } from "@libs/wallet-dtos";
import { ContextService } from "../contexts/context.service.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  CredentialConfigDto,
  CredentialsConfigDto,
  CredentialsDto,
  VerifiableCredentialDto,
} from "./credentials.schemas.js";
import { validationPipe } from "../utils/validation.pipe.js";
import {
  ApiForbiddenResponseDefault,
  ApiConflictResponseDefault,
  ApiBadRequestResponseDefault,
  ApiNotFoundResponseDefault,
} from "../utils/swagger.js";

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
  @ApiOperation({
    summary: "List credentials",
    description:
      "List all credentials, that the current user is allowed to view, in this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto],
  })
  @ApiForbiddenResponseDefault()
  async getCredentials(@Client() client: ClientInfo): Promise<Credentials[]> {
    const targetDid = this.targetDid("view", client);
    return this.credentialsService.getCredentials(targetDid);
  }

  @Get("/dataspace")
  @ApiOperation({
    summary: "List dataspace credentials",
    description: "List all credentials in this dataspace.",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto],
  })
  @ApiForbiddenResponseDefault()
  async getDataspaceCredentials(): Promise<Credentials[]> {
    return this.credentialsService.getDataspaceCredentials();
  }

  @Get("config")
  @ApiOperation({
    summary: "Retrieve credential configuration",
    description:
      "Retrieves credential configuration that can be used by this wallet. Contains both trust anchors and JSON-LD contexts.",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: CredentialConfigDto,
  })
  @ApiForbiddenResponseDefault()
  @UsePipes(validationPipe)
  async getConfig(): Promise<CredentialsConfigDto> {
    return {
      trustAnchors: this.config.trustAnchors,
      contexts: await this.contextService.getContexts(),
    };
  }

  @Post()
  @ApiOperation({
    summary: "Add credential",
    description: "Issue a new credential within this wallet",
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
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.issueCredential(credentialConfig, targetDid);
  }

  @Post("import")
  @ApiOperation({
    summary: "Import credential",
    description: "Import a credential issued by an external credential issuer",
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: VerifiableCredentialDto })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async importCredential(
    @Body() credential: VerifiableCredential<CredentialSubject>,
    @Client() client: ClientInfo
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.importCredential(credential, targetDid);
  }

  @Get(":credentialId")
  @ApiOperation({
    summary: "Retrieve credential",
    description: "Retrieve a specific credential within this wallet",
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
      "Update a credential within this wallet. __*Note*__: this will either self-issue or import a credential.",
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
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.updateCredential(
      credentialId,
      credentialConfig,
      targetDid
    );
  }

  @Delete(":credentialId")
  @ApiOperation({
    summary: "Delete credential",
    description: "Deletes an existing credential within this wallet",
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
