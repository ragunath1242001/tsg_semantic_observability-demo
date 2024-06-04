import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { TokenService } from "../../keys/token.service.js";
import { SIToken } from "../../model/iatp.dao.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import crypto from "crypto";
import { AppError } from "../../utils/error.js";
import { DidService } from "../../did/did.service.js";
import { JWTPayload } from "jose";

@Injectable()
export class IatpSiopService {
  constructor(
    private readonly didService: DidService,
    private readonly tokenService: TokenService,
    @InjectRepository(SIToken)
    private readonly siTokenRepository: Repository<SIToken>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createSelfIssuedIDToken(
    audience: string,
    createAccessToken: boolean,
    scope?: string,
    existingAccessToken?: string
  ): Promise<string> {
    this.logger.debug(
      `Creating SI ID token for audience ${audience}, creating access token ${createAccessToken}, scope ${scope}`
    );
    const jwtPayload: JWTPayload = {
      aud: audience,
    };
    if (createAccessToken) {
      const token = crypto.randomBytes(48).toString("hex");
      this.siTokenRepository.save({
        accessToken: token,
        audience: audience,
        scope: scope,
      });
      jwtPayload["token"] = token;
    } else if (existingAccessToken) {
      jwtPayload["token"] = existingAccessToken;
    }
    if (scope) {
      jwtPayload["bearer_access_scope"] = scope;
    }
    return await this.tokenService.create(jwtPayload);
  }

  async validateIDToken(idToken: string): Promise<JWTPayload> {
    const didId = await this.didService.getDidId();
    const validatedToken = await this.tokenService.validate(idToken);

    if (validatedToken.aud !== didId) {
      throw new AppError(
        `Audience in ID token claim mismatch ${validatedToken.aud} vs. ${didId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    return validatedToken;
  }

  async validateIDTokenWithAccessToken(idToken: string): Promise<{
    tokenPayload: JWTPayload;
    originalIdToken: SIToken;
  }> {
    const validatedToken = await this.validateIDToken(idToken);

    if (!validatedToken.token) {
      throw new AppError(
        `No access token in ID token`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    const siToken = await this.siTokenRepository.findOneBy({
      accessToken: validatedToken.token as string,
    });
    if (!siToken) {
      throw new AppError(
        `Token in ID token not found locally`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    if (siToken.audience !== validatedToken.iss) {
      throw new AppError(
        `ID Token issuer does not match the audience for the access token ${validatedToken.iss} vs. ${siToken.audience}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    return {
      tokenPayload: validatedToken,
      originalIdToken: siToken,
    };
  }
}
