import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Post, Put, ValidationPipe } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { CredentialInstance, CredentialsService, KeyMaterial } from "../services/credentials.service";
import { CredentialConfig, KeyConfig } from "../config";
import { AppError } from "../utils/error";

@Controller('management/credentials')
export class CredentialsManagementController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get("did")
  @HttpCode(HttpStatus.OK)
  async getDid(): Promise<DIDDocument> {
    const didDocument = await this.credentialsService.getDid();
    if (didDocument === undefined) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    return didDocument;
  }

  @Get("keys")
  @HttpCode(HttpStatus.OK)
  async getKeys(): Promise<KeyMaterial[]> {
    return this.credentialsService.getKeys();
  }

  @Post("keys")
  @HttpCode(HttpStatus.OK)
  async addKey(@Body(new ValidationPipe()) keyConfig: KeyConfig): Promise<KeyMaterial> {
    return this.credentialsService.addKey(keyConfig);
  }
  
  @Get("keys/:keyId")
  @HttpCode(HttpStatus.OK)
  async getKey(@Param('keyId') keyId: string): Promise<KeyMaterial> {
    return this.credentialsService.getKey(keyId);
  }
  
  @Delete("keys/:keyId")
  @HttpCode(HttpStatus.OK)
  async deleteKey(@Param('keyId') keyId: string): Promise<void> {
    return this.credentialsService.deleteKey(keyId);
  }

  @Put("keys/:keyId/default")
  @HttpCode(HttpStatus.OK)
  async setDefaultKey(@Param('keyId') keyId: string): Promise<void> {
    this.credentialsService.changeDefaultKey(keyId);
  }
  
  @Get("credentials")
  @HttpCode(HttpStatus.OK)
  async getCredentials(): Promise<CredentialInstance[]> {
    return this.credentialsService.getCredentials();
  }

  @Post("credentials")
  @HttpCode(HttpStatus.OK)
  async addCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig): Promise<CredentialInstance> {
    return this.credentialsService.addCredential(credentialConfig);
  }
  
  @Get("credentials/:credentialId")
  @HttpCode(HttpStatus.OK)
  async getCredential(@Param('credentialId') credentialId: string): Promise<CredentialInstance> {
    return this.credentialsService.getCredential(credentialId);
  }

  @Put("credentials/:credentialId")
  @HttpCode(HttpStatus.OK)
  async updateCredential(@Body(new ValidationPipe({transform: true})) credentialConfig: CredentialConfig, @Param('credentialId') credentialId: string): Promise<CredentialInstance> {
    return this.credentialsService.updateCredential(credentialId, credentialConfig);
  }

  @Delete("credentials/:credentialId")
  @HttpCode(HttpStatus.OK)
  async deleteCredential(@Param('credentialId') credentialId: string): Promise<void> {
    return this.credentialsService.deleteCredential(credentialId);
  }
}