import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, ValidationPipe } from "@nestjs/common";
import { CredentialsService } from "../wallet/credentials.service.js";
import { CredentialConfig } from "../config.js";
import { Credentials } from "../model/credentials.dao.js";
import { CredentialSubject, VerifiableCredential } from "../model/credential.dto.js";

@Controller('management/credentials')
export class CredentialsManagementController {
  constructor(
    private readonly credentialsService: CredentialsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCredentials(): Promise<Credentials[]> {
    return this.credentialsService.getCredentials();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig): Promise<Credentials> {
    return this.credentialsService.issueCredential(credentialConfig);
  }

  @Post("import")
  @HttpCode(HttpStatus.OK)
  async importCredential(@Body() credential: VerifiableCredential<CredentialSubject>): Promise<Credentials> {
    return this.credentialsService.importCredential(credential);
  }
  
  @Get(":credentialId")
  @HttpCode(HttpStatus.OK)
  async getCredential(@Param('credentialId') credentialId: string): Promise<Credentials> {
    return this.credentialsService.getCredential(credentialId);
  }

  @Put(":credentialId")
  @HttpCode(HttpStatus.OK)
  async updateCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig, @Param('credentialId') credentialId: string): Promise<Credentials> {
    return this.credentialsService.updateCredential(credentialId, credentialConfig);
  }

  @Delete(":credentialId")
  @HttpCode(HttpStatus.OK)
  async deleteCredential(@Param('credentialId') credentialId: string): Promise<void> {
    return this.credentialsService.deleteCredential(credentialId);
  }
}