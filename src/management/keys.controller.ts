import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, ValidationPipe } from "@nestjs/common";
import { KeyConfig } from "../config.js";
import { KeyMaterials } from "../model/credentials.dao.js";
import { KeyService } from "../wallet/keys.service.js";

@Controller('management/keys')
export class KeysManagementController {
  constructor(
    private readonly keyService: KeyService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getKeys(): Promise<KeyMaterials[]> {
    return this.keyService.getKeys();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addKey(@Body(new ValidationPipe()) keyConfig: KeyConfig): Promise<KeyMaterials> {
    return this.keyService.addKey(keyConfig);
  }
  
  @Get(":keyId")
  @HttpCode(HttpStatus.OK)
  async getKey(@Param('keyId') keyId: string): Promise<KeyMaterials> {
    return this.keyService.getKey(keyId);
  }
  
  @Delete(":keyId")
  @HttpCode(HttpStatus.OK)
  async deleteKey(@Param('keyId') keyId: string): Promise<void> {
    return this.keyService.deleteKey(keyId);
  }

  @Put(":keyId/default")
  @HttpCode(HttpStatus.OK)
  async setDefaultKey(@Param('keyId') keyId: string): Promise<void> {
    this.keyService.changeDefaultKey(keyId);
  }
}