import { Injectable } from "@nestjs/common";
import {
  DevWalletConfig,
  MiwConfig,
  RootConfig,
  TsgWalletDirectConfig,
  TsgWalletIatpConfig,
} from "../config";
import { WalletClient } from "./wallets/walletClient";
import { TsgWalletClient } from "./wallets/tsg.wallet";
import { ManagedIdentityWalletClient } from "./wallets/miw.wallet";
import { DevWalletClient } from "./wallets/dev.wallet";
import { TsgIatpWalletClient } from "./wallets/tsg.iatp.wallet";
import {
  VerifiablePresentation,
  VerifiableCredential,
  CredentialSubject,
} from "@tsg-dsp/common";

@Injectable()
export class AuthService {
  readonly walletClient: WalletClient;
  constructor(private readonly config: RootConfig) {
    switch (config.iam.type) {
      case "dev":
        this.walletClient = new DevWalletClient(config.iam as DevWalletConfig);
        break;
      case "tsg":
        this.walletClient = new TsgWalletClient(
          config.iam as TsgWalletDirectConfig
        );
        break;
      case "tsg-iatp":
        this.walletClient = new TsgIatpWalletClient(
          config.iam as TsgWalletIatpConfig
        );
        break;
      case "miw":
        this.walletClient = new ManagedIdentityWalletClient(
          config.iam as MiwConfig
        );
        break;
    }
  }

  async requestToken(audience: string): Promise<string> {
    const vpToken = await this.walletClient.requestVerifiablePresentation(
      audience
    );
    return vpToken;
  }

  async validateToken(
    token: string,
    audience?: string
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  > {
    return await this.walletClient.requestValidation(
      token,
      audience || this.config.iam.didId
    );
  }
}
