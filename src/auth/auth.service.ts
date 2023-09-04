import { Injectable } from "@nestjs/common";
import { IamConfig } from "../config";
import { WalletClient } from "./wallets/walletClient";
import { TsgWalletClient } from "./wallets/tsg.wallet";
import { ManagedIdentityWalletClient } from "./wallets/miw.wallet";

@Injectable()
export class AuthService {
  private readonly walletClient: WalletClient;
  constructor(private readonly iamConfig: IamConfig) {
    switch (iamConfig.type) {
      case "tsg": this.walletClient = new TsgWalletClient(iamConfig) ; break;
      case "miw": this.walletClient = new ManagedIdentityWalletClient(iamConfig) ; break;
    }
  }

  async requestToken(audience: string): Promise<string> {
    const vpJwt = await this.walletClient.requestVerifiablePresentation(audience);
    return vpJwt.vp;
  }

  async validateToken(token: string, audience?: string): Promise<boolean> {
    return await this.walletClient.requestValidation({
      vp: token
    }, audience || this.iamConfig.didId);
  }
}
