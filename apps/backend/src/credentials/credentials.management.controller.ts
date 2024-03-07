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
  ValidationPipe,
} from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import {
  InitCredentialConfig,
  JsonLdContextConfig,
  RootConfig,
  TrustAnchorConfig,
} from "../config.js";
import { Credentials } from "../model/credentials.dao.js";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common";
import { Client } from "../auth/roles.guard.js";
import { AppError } from "../utils/error.js";
import { ClientInfo, AppRole } from "@libs/dtos";
import { ComplianceRequest, LegalRegistrationNumberRequest } from "@libs/dtos";

@Controller("management/credentials")
export class CredentialsManagementController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly config: RootConfig
  ) {}

  private targetDid(
    action: "view" | "manage",
    client: ClientInfo
  ): string | undefined {
    switch (action) {
      case "view":
        if (client.roles.includes(AppRole.VIEW_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.VIEW_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(
            `Not allowed to view credentials`,
            HttpStatus.FORBIDDEN
          );
        }
      case "manage":
        if (client.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS)) {
          return undefined;
        } else if (client.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS)) {
          return client.didId;
        } else {
          throw new AppError(
            `Not allowed to manage credentials`,
            HttpStatus.FORBIDDEN
          );
        }
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCredentials(@Client() client: ClientInfo): Promise<Credentials[]> {
    const targetDid = this.targetDid("view", client);
    return this.credentialsService.getCredentials(targetDid);
  }

  @Get("config")
  @HttpCode(HttpStatus.OK)
  async getConfig(): Promise<{
    trustAnchors: TrustAnchorConfig[];
    contexts: JsonLdContextConfig[];
  }> {
    return {
      trustAnchors: this.config.trustAnchors,
      contexts: this.config.contexts,
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addCredential(
    @Body(new ValidationPipe({ transform: true }))
    credentialConfig: InitCredentialConfig,
    @Client() client: ClientInfo
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.issueCredential(credentialConfig, targetDid);
  }

  @Post("import")
  @HttpCode(HttpStatus.OK)
  async importCredential(
    @Body() credential: VerifiableCredential<CredentialSubject>,
    @Client() client: ClientInfo
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.importCredential(credential, targetDid);
  }

  @Get(":credentialId")
  @HttpCode(HttpStatus.OK)
  async getCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.getCredential(credentialId, targetDid);
  }

  @Put(":credentialId")
  @HttpCode(HttpStatus.OK)
  async updateCredential(
    @Body(new ValidationPipe({ transform: true }))
    credentialConfig: InitCredentialConfig,
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<Credentials> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.updateCredential(
      credentialId,
      credentialConfig,
      targetDid
    );
  }

  @Delete(":credentialId")
  @HttpCode(HttpStatus.OK)
  async deleteCredential(
    @Param("credentialId") credentialId: string,
    @Client() client: ClientInfo
  ): Promise<void> {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.deleteCredential(credentialId, targetDid);
  }

  @Post("gaiax/legalRegistrationNumber")
  @HttpCode(HttpStatus.OK)
  async requestLegalRegistrationNumberCredential(
    @Body(new ValidationPipe({ transform: true }))
    credentialConfig: LegalRegistrationNumberRequest,
    @Client() client: ClientInfo
  ) {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.requestLegalRegistrationNumberCredential(
      credentialConfig,
      targetDid
    );
  }

  @Post("gaiax/compliance")
  @HttpCode(HttpStatus.OK)
  async requestComplianceCredential(
    @Body(new ValidationPipe({ transform: true }))
    credentialConfig: ComplianceRequest,
    @Client() client: ClientInfo
  ) {
    const targetDid = this.targetDid("manage", client);
    return this.credentialsService.requestComplianceCredential(
      credentialConfig,
      targetDid
    );
  }
}
