import { Injectable } from "@nestjs/common";
import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { DevWalletConfig, RootConfig, TsgWalletConfig } from "../config.js";
import { AuthClientService } from "./auth.client.service.js";
import { DevWalletClient } from "./wallets/dev.wallet.js";
import { WalletClient } from "./wallets/walletClient.js";
import { InputDescriptor } from "@tsg-dsp/common-dtos";
import { TsgWalletClient } from "./wallets/tsg.wallet.js";

@Injectable()
export class AuthService {
  readonly walletClient: WalletClient;
  constructor(
    private readonly config: RootConfig,
    authClientService: AuthClientService
  ) {
    switch (config.iam.type) {
      case "dev":
        this.walletClient = new DevWalletClient(config.iam as DevWalletConfig);
        break;
      case "tsg":
        this.walletClient = new TsgWalletClient(
          config.iam as TsgWalletConfig,
          authClientService
        );
        break;
    }
  }

  async requestToken(audience: string): Promise<string> {
    return await this.walletClient.requestVerifiablePresentation(audience);
  }

  async validateToken(
    token: string,
    audience?: string,
    inputDescriptors?: InputDescriptor[]
  ): Promise<VerifiablePresentation[] | undefined> {
    return await this.walletClient.requestValidation(
      token,
      audience || this.config.iam.didId,
      inputDescriptors
    );
  }

  async requestSignature(document: Record<string, any>): Promise<any> {
    return this.walletClient.requestSignature(document);
  }

  async requestSignatureValidation(
    signedDocument: Record<string, any>
  ): Promise<any> {
    return this.walletClient.requestSignatureValidation(signedDocument);
  }
}
