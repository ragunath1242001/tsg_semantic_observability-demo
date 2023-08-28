import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, ValidationPipe } from "@nestjs/common";
import { KeyConfig } from "../config.js";
import { KeyService } from "../wallet/keys.service.js";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "../model/clients.dto.js";
import { KeyInfo } from "../model/credentials.dto.js";

@Controller('management/keys')
@Roles(AppRole.MANAGE_KEYS)
export class KeysManagementController {
  constructor(
    private readonly keyService: KeyService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getKeys(): Promise<KeyInfo[]> {
    const keys = await this.keyService.getKeys();
    return keys.map(k => {
      return {
        id: k.id,
        type: k.type,
        default: k.default,
        publicKey: k.publicKey,
        created: k.created,
        modified: k.modified
      }
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addKey(@Body(new ValidationPipe()) keyConfig: KeyConfig): Promise<KeyInfo> {
    const key = await this.keyService.addKey(keyConfig);
    return {
      id: key.id,
      type: key.type,
      default: key.default,
      publicKey: key.publicKey,
      created: key.created,
      modified: key.modified
    };
  }
  
  @Get(":keyId")
  @HttpCode(HttpStatus.OK)
  async getKey(@Param('keyId') keyId: string): Promise<KeyInfo> {
    const key = await this.keyService.getKey(keyId);
    return {
      id: key.id,
      type: key.type,
      default: key.default,
      publicKey: key.publicKey,
      created: key.created,
      modified: key.modified
    };
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