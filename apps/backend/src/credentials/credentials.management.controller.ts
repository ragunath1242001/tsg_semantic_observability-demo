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
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common";
import { Client } from "../auth/roles.guard.js";
import { AppError } from "../utils/error.js";
import { ClientInfo, AppRole } from "@libs/dtos";
import { ContextService } from "../contexts/context.service.js";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  CredentialConfigDto,
  CredentialsConfigDto,
  CredentialsDto,
  VerifiableCredentialDto,
} from "./credentials.schemas.js";
import { validationPipe } from "../utils/validation.pipe.js";

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
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto],
  })
  @ApiForbiddenResponse()
  @HttpCode(HttpStatus.OK)
  async getCredentials(@Client() client: ClientInfo): Promise<Credentials[]> {
    const targetDid = this.targetDid("view", client);
    return this.credentialsService.getCredentials(targetDid);
  }

  @Get("config")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: CredentialConfigDto,
  })
  @ApiForbiddenResponse()
  @UsePipes(validationPipe)
  @HttpCode(HttpStatus.OK)
  async getConfig(): Promise<CredentialsConfigDto> {
    return {
      trustAnchors: this.config.trustAnchors,
      contexts: await this.contextService.getContexts(),
    };
  }

  @Post()
  @ApiBody({ type: CredentialConfigDto })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
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
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: VerifiableCredentialDto })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async importCredential(
    @Body() credential: VerifiableCredential<CredentialSubject>,
    @Client() client: ClientInfo
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.importCredential(credential, targetDid);
  }

  @Get(":credentialId")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async getCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<CredentialsDto> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.getCredential(credentialId, targetDid);
  }

  @Put(":credentialId")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: CredentialConfigDto })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
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
  @HttpCode(HttpStatus.OK)
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS, AppRole.MANAGE_OWN_CREDENTIALS])
  async deleteCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<void> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.deleteCredential(credentialId, targetDid);
  }
}
