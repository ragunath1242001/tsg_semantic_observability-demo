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
} from "@nestjs/common";
import { InitKeyConfig } from "../config.js";
import { KeysService } from "./keys.service.js";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/wallet-dtos";
import { KeyInfo } from "@libs/wallet-dtos";
import { validationPipe } from "../utils/validation.pipe.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { KeyConfigDto, KeyInfoDto } from "./keys.schemas.js";
import {
  ApiForbiddenResponseDefault,
  ApiBadRequestResponseDefault,
  ApiConflictResponseDefault,
  ApiNotFoundResponseDefault,
} from "../utils/swagger.js";

@Controller("management/keys")
@ApiTags("Management Keys")
@ApiOAuth2([AppRole.MANAGE_KEYS])
@Roles(AppRole.MANAGE_KEYS)
export class KeysManagementController {
  constructor(private readonly keyService: KeysService) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve keys",
    description: "Retrieves all keys registered for this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [KeyInfoDto] })
  @ApiForbiddenResponseDefault()
  async getKeys(): Promise<KeyInfo[]> {
    const keys = await this.keyService.getKeys();
    return keys.map((k) => {
      return {
        id: k.id,
        type: k.type,
        default: k.default,
        publicKey: k.publicKey,
        created: k.created,
        modified: k.modified,
      };
    });
  }

  @Post()
  @ApiOperation({
    summary: "Add key",
    description: "Generates a new key based on the provided configuration",
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: KeyConfigDto })
  @ApiOkResponse({ type: KeyInfoDto })
  @ApiBadRequestResponseDefault()
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  async addKey(
    @Body(validationPipe) keyConfig: InitKeyConfig
  ): Promise<KeyInfo> {
    const key = await this.keyService.addKey(keyConfig);
    return {
      id: key.id,
      type: key.type,
      default: key.default,
      publicKey: key.publicKey,
      created: key.created,
      modified: key.modified,
    };
  }

  @Get(":keyId")
  @ApiOperation({
    summary: "Retrieve key",
    description:
      "Retrieves key information of a specific key within this wallet",
  })
  @ApiOkResponse({ type: KeyInfoDto })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async getKey(@Param("keyId") keyId: string): Promise<KeyInfo> {
    const key = await this.keyService.getKey(keyId);
    return {
      id: key.id,
      type: key.type,
      default: key.default,
      publicKey: key.publicKey,
      created: key.created,
      modified: key.modified,
    };
  }

  @Delete(":keyId")
  @ApiOperation({
    summary: "Delete key",
    description: "Deletes an existing key within this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async deleteKey(@Param("keyId") keyId: string): Promise<void> {
    return this.keyService.deleteKey(keyId);
  }

  @Put(":keyId/default")
  @ApiOperation({
    summary: "Set default key",
    description:
      "Sets the provided key as default key within this wallet, will remove the default key flag for other keys in this wallet",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async setDefaultKey(@Param("keyId") keyId: string): Promise<void> {
    this.keyService.changeDefaultKey(keyId);
  }
}
