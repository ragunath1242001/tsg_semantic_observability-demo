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
import { AppRole } from "@libs/dtos";
import { KeyInfo } from "@libs/dtos";
import { validationPipe } from "../utils/validation.pipe.js";
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
import { KeyConfigDto, KeyInfoDto } from "./keys.schema.js";

@Controller("management/keys")
@ApiTags("Management Keys")
@ApiOAuth2([AppRole.MANAGE_KEYS])
@Roles(AppRole.MANAGE_KEYS)
export class KeysManagementController {
  constructor(private readonly keyService: KeysService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [KeyInfoDto] })
  @ApiForbiddenResponse()
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
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: KeyConfigDto })
  @ApiOkResponse({ type: KeyInfoDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  @ApiForbiddenResponse()
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
  @ApiOkResponse({ type: KeyInfoDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
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
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async deleteKey(@Param("keyId") keyId: string): Promise<void> {
    return this.keyService.deleteKey(keyId);
  }

  @Put(":keyId/default")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async setDefaultKey(@Param("keyId") keyId: string): Promise<void> {
    this.keyService.changeDefaultKey(keyId);
  }
}
