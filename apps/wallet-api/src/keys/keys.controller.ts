import { Controller, Get, Header, HttpStatus, Param } from "@nestjs/common";
import { KeysService } from "./keys.service.js";
import { AppError } from "../utils/error.js";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ApiOkResponse, ApiTags, ApiOperation } from "@nestjs/swagger";
import { ApiNotFoundResponseDefault } from "../utils/swagger.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Keys")
export class KeysController {
  constructor(private readonly keyService: KeysService) {}

  @Get("keys/:id")
  @ApiOperation({
    summary: "Retrieve Key CA chain",
    description:
      "Retrieves the CA chain for a given key. Only supported for keys with type `X509`",
  })
  @Header("content-type", "application/x-x509-ca-cert")
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
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
