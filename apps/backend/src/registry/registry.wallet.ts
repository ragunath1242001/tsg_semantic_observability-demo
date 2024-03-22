import axios from "axios";
import { DSPClientError } from "../utils/errors/error";
import { TsgWalletClient } from "../auth/wallets/tsg.wallet";
import { IamConfig } from "../config";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";

interface Credential {
  id: string;
  targetDid: string;
  credential: VerifiableCredential<CredentialSubject>;
  selfIssued: boolean;
}

export class RegistryWalletClient extends TsgWalletClient {
  constructor(iamConfig: IamConfig) {
    super(iamConfig);
  }

  async getCredentials() {
    try {
      await this.ensureAccessToken();
      return await axios.get<Credential[]>(
        `${this.iamConfig.walletUrl}/management/credentials`
      );
    } catch (err) {
      throw new DSPClientError("Could not get credentials", err);
    }
  }
}
