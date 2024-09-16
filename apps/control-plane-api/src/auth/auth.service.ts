import { Injectable } from "@nestjs/common";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common-dsp";
import {
  DevWalletConfig,
  MiwConfig,
  RootConfig,
  TsgWalletDirectConfig,
  TsgWalletIatpConfig,
} from "../config";
import { AuthClientService } from "./auth.client.service";
import { DevWalletClient } from "./wallets/dev.wallet";
import { ManagedIdentityWalletClient } from "./wallets/miw.wallet";
import { TsgIatpWalletClient } from "./wallets/tsg.iatp.wallet";
import { TsgWalletClient } from "./wallets/tsg.wallet";
import { WalletClient } from "./wallets/walletClient";
import { InputDescriptor } from "@tsg-dsp/common-dtos";

@Injectable()
export class AuthService {
  readonly walletClient: WalletClient;
  constructor(
    private readonly config: RootConfig,
    private readonly authClientService: AuthClientService
  ) {
    switch (config.iam.type) {
      case "dev":
        this.walletClient = new DevWalletClient(config.iam as DevWalletConfig);
        break;
      case "tsg":
        this.walletClient = new TsgWalletClient(
          config.iam as TsgWalletDirectConfig,
          authClientService
        );
        break;
      case "tsg-iatp":
        this.walletClient = new TsgIatpWalletClient(
          config.iam as TsgWalletIatpConfig,
          authClientService
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
    return await this.walletClient.requestVerifiablePresentation(audience);
  }

  async validateToken(
    token: string,
    audience?: string,
    inputDescriptors?: InputDescriptor[]
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  > {
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
