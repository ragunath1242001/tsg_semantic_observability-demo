import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuthClientService } from "@tsg-dsp/common-api";
import { CredentialContainer } from "@tsg-dsp/common-dsp";
import { Request } from "express";
import { decode, JwtPayload } from "jsonwebtoken";
import { Repository } from "typeorm";

import { DevWalletConfig, RootConfig, TsgWalletConfig } from "../config.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { RuleRepositoryService } from "../policy/rule.repository.service.js";
import { DSPError } from "../utils/errors/error.js";
import { DevWalletClient } from "./wallets/dev.wallet.js";
import { TsgWalletClient } from "./wallets/tsg.wallet.js";
import { WalletClient } from "./wallets/walletClient.js";

@Injectable()
export class VCAuthService {
  readonly walletClient: WalletClient;
  constructor(
    private readonly config: RootConfig,
    authClientService: AuthClientService,
    @InjectRepository(AgreementDao)
    private readonly agreementRepository: Repository<AgreementDao>,
    @InjectRepository(TransferMonitorDao)
    private readonly transferMonitorRepository: Repository<TransferMonitorDao>
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
  private readonly logger = new Logger(VCAuthService.name);

  async requestToken(audience: string): Promise<string> {
    return await this.walletClient.requestVerifiablePresentation(audience);
  }

  async validateToken(
    token: string,
    audience?: string,
    scope?: string[]
  ): Promise<CredentialContainer[] | undefined> {
    return await this.walletClient.requestValidation(
      token,
      audience || this.config.iam.didId,
      undefined,
      scope
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

  async validateVP(token: string): Promise<CredentialContainer[]> {
    let tokenPayload: JwtPayload | null = null;
    try {
      tokenPayload = decode(token, { json: true });
    } catch (err) {
      throw new DSPError(
        "Malformed token",
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(this.logger, "warn");
    }
    if (!tokenPayload) {
      this.logger.warn(`Token could not be decoded: ${token}`);
      throw new DSPError(
        "Token could not be decoded",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    const valid = await this.validateToken(token);
    if (!valid || valid.length === 0) {
      throw new DSPError(
        "Verifiable Presentation token not valid",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    return valid;
  }

  async validateTransferVP(
    req: Request,
    token: string
  ): Promise<CredentialContainer[]> {
    let tokenPayload: JwtPayload | null = null;
    try {
      tokenPayload = decode(token, { json: true });
    } catch (err) {
      throw new DSPError(
        "Malformed token",
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(this.logger, "warn");
    }
    if (!tokenPayload) {
      this.logger.warn(`Token could not be decoded: ${token}`);
      throw new DSPError(
        "Token could not be decoded",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }

    this.logger.debug(`Find agreement for url ${req.url}`);
    let agreementDao: AgreementDao | null | undefined;
    if (req.params.id) {
      this.logger.debug(`Find agreement by param ${req.params.id}`);
      const transfer = await this.transferMonitorRepository.findOneBy({
        id: req.params.id
      });
      agreementDao = transfer?.agreement;
    } else if (req.body.agreementId) {
      this.logger.debug(`Find agreement by body ${req.body.agreementId}`);
      agreementDao = await this.agreementRepository.findOneBy({
        id: req.body.agreementId
      });
    }

    if (agreementDao) {
      this.logger.debug(`Found agreement ${agreementDao.id}`);
      const scopeConstraints =
        agreementDao.agreement.permission?.flatMap(
          (p) =>
            p.constraint?.filter(
              (c) => c.leftOperand === "tsg:presentationScope"
            ) ?? []
        ) ?? [];
      if (scopeConstraints.length > 0) {
        this.logger.debug(`Found scope constraint(s)`);
        if (scopeConstraints.length > 1) {
          // Protocol changes needed to support multiple permissions/constraints
          this.logger.warn(
            `Multiple scope constraints found, only the first will be used for validation`
          );
        }
        const scope = [
          RuleRepositoryService.parseRightOperand(
            scopeConstraints[0].rightOperand
          )
        ].filter((s): s is string => !!s);
        if (!scope || scope.length === 0) {
          this.logger.warn(
            `No scopes found in constraint ${JSON.stringify(
              scopeConstraints[0]
            )}, skipping scope validation`
          );
          throw new DSPError(
            "No valid scopes found in agreement",
            HttpStatus.UNAUTHORIZED
          ).andLog(this.logger, "warn");
        }
        this.logger.debug(`Found scope(s): ${scope.join(", ")}`);
        const valid = await this.validateToken(
          token,
          this.config.iam.didId,
          scope
        );
        if (valid && valid.length > 0) {
          return valid.map(
            (c) => ({ ...c, scope: scope[0] }) as CredentialContainer
          );
        }
      }
    }
    const valid = await this.validateToken(token);
    if (!valid || valid.length === 0) {
      throw new DSPError(
        "Verifiable Presentation token not valid",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    return valid;
  }
}
