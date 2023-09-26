import { Controller, Get, Header, HttpStatus, Param } from "@nestjs/common";
import { DisableJwtGuard } from "../auth/jwt.guard.js";
import { KeyService } from "./keys.service.js";
import { AppError } from "../utils/error.js";

@Controller()
@DisableJwtGuard(true)
export class KeysController {
  constructor(
    private readonly keyService: KeyService,
  ) {}

  @Get('keys/:id')
  @Header('content-type', 'application/x-x509-ca-cert')
  async getCaChain(@Param('id') id: string): Promise<string> {
    const key = await this.keyService.getKey(id);
    if (key.caChain) {
      return key.caChain;
    } else {
      throw new AppError(`Key with id ${id} does not contain a CA chain`, HttpStatus.NOT_FOUND);
    }
  }
}