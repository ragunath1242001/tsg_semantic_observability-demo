import { Controller, Get, Header, HttpStatus, Param } from "@nestjs/common";
import { KeysService } from "./keys.service.js";
import { AppError } from "../utils/error.js";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller()
@DisableOAuthGuard()
@ApiTags("Keys")
export class KeysController {
  constructor(private readonly keyService: KeysService) {}

  @Get("keys/:id")
  @Header("content-type", "application/x-x509-ca-cert")
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async getCaChain(@Param("id") id: string): Promise<string> {
    const key = await this.keyService.getKey(id);
    if (key.caChain) {
      return key.caChain;
    } else {
      throw new AppError(
        `Key with id ${id} does not contain a CA chain`,
        HttpStatus.NOT_FOUND
      );
    }
  }
}
