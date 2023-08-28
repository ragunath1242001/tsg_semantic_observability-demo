import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, ValidationPipe } from "@nestjs/common";
import { CredentialsService } from "../wallet/credentials.service.js";
import { CredentialConfig } from "../config.js";
import { Credentials } from "../model/credentials.dao.js";
import { CredentialSubject, VerifiableCredential } from "../model/credentials.dto.js";
import { Client } from "../auth/roles.guard.js";
import { AppError } from "../utils/error.js";
import { ClientInfo, AppRole } from "../model/clients.dto.js";

@Controller('management/credentials')
export class CredentialsManagementController {
  constructor(
    private readonly credentialsService: CredentialsService,
  ) {}

  private targetDid(action: 'view' | 'manage', client: ClientInfo): string | undefined {
    switch(action) {
      case "view":
        if (client.roles.includes(AppRole.VIEW_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.VIEW_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(`Not allowed to view credentials`, HttpStatus.FORBIDDEN)
        }
      case "manage":
        if (client.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(`Not allowed to manage credentials`, HttpStatus.FORBIDDEN)
        }
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCredentials(@Client() client: ClientInfo): Promise<Credentials[]> {
    const targetDid = this.targetDid('view', client);
    return this.credentialsService.getCredentials(targetDid);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig, @Client() client: ClientInfo): Promise<Credentials> {
    const targetDid = this.targetDid('manage', client);
    return this.credentialsService.issueCredential(credentialConfig, targetDid);
  }

  @Post("import")
  @HttpCode(HttpStatus.OK)
  async importCredential(@Body() credential: VerifiableCredential<CredentialSubject>, @Client() client: ClientInfo): Promise<Credentials> {
    const targetDid = this.targetDid('manage', client);
    return this.credentialsService.importCredential(credential, targetDid);
  }
  
  @Get(":credentialId")
  @HttpCode(HttpStatus.OK)
  async getCredential(@Param('credentialId') credentialId: string, @Client() client: ClientInfo): Promise<Credentials> {
    const targetDid = this.targetDid('manage', client);
    return this.credentialsService.getCredential(credentialId, targetDid);
  }

  @Put(":credentialId")
  @HttpCode(HttpStatus.OK)
  async updateCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig, @Param('credentialId') credentialId: string, @Client() client: ClientInfo): Promise<Credentials> {
    const targetDid = this.targetDid('manage', client);
    return this.credentialsService.updateCredential(credentialId, credentialConfig, targetDid);
  }

  // @Put(":credentialId/issue")
  // @HttpCode(HttpStatus.OK)
  // async issueCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig, @Param('credentialId') credentialId: string, @Client() client: ClientInfo): Promise<Credentials> {
  //   const targetDid = this.targetDid('manage', client);
  //   return this.credentialsService.issueCredential(credentialId, credentialConfig, targetDid);
  // }

  @Delete(":credentialId")
  @HttpCode(HttpStatus.OK)
  async deleteCredential(@Param('credentialId') credentialId: string, @Client() client: ClientInfo): Promise<void> {
    const targetDid = this.targetDid('manage', client);
    return this.credentialsService.deleteCredential(credentialId, targetDid);
  }
}