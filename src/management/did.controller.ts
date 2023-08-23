import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { AppError } from "../utils/error.js";
import { DidService } from "../wallet/did.service.js";

@Controller('management/did')
export class DidManagementController {
  constructor(
    private readonly didService: DidService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getDid(): Promise<DIDDocument> {
    const didDocument = await this.didService.getDid();
    if (didDocument === undefined) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    return didDocument;
  }
}