import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { validateJwt } from "@tsg-dsp/common-signing-and-validation";
import crypto from "crypto";
import { JWTPayload } from "jose";
import { Repository } from "typeorm";

import { DidService } from "../did/did.service.js";
import { SIToken } from "../model/dcp.dao.js";
import { SignatureService } from "./signature.service.js";

@Injectable()
export class SecureTokenService {
  constructor(
    private readonly didService: DidService,
    private readonly signatureService: SignatureService,
    @InjectRepository(SIToken)
    private readonly siTokenRepository: Repository<SIToken>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createSelfIssuedIDToken({
    audience,
    createAccessToken,
    scope,
    existingAccessToken,
    preAuthorizedCode
  }: {
    audience: string;
    createAccessToken: boolean;
    scope?: string;
    existingAccessToken?: string;
    preAuthorizedCode?: string;
  }): Promise<string> {
    this.logger.debug(
      `Creating SI ID token for audience ${audience}, creating access token ${createAccessToken}, scope ${scope}`
    );
    const jwtPayload: JWTPayload = {
      aud: audience
    };
    if (createAccessToken) {
      const token = crypto.randomBytes(48).toString("hex");
      this.siTokenRepository.save({
        accessToken: token,
        audience: audience,
        scope: scope
      });
      jwtPayload["token"] = token;
    } else if (existingAccessToken) {
      jwtPayload["token"] = existingAccessToken;
    }
    if (scope) {
      jwtPayload["bearer_access_scope"] = scope;
    }
    if (preAuthorizedCode) {
      jwtPayload["pre-authorized_code"] = preAuthorizedCode;
    }
    return await this.signatureService.signAsJwt(jwtPayload, audience, {
      expirationTime: "5m"
    });
  }

  async validateIDToken(idToken: string): Promise<
    JWTPayload & {
      iss: string;
      sub: string;
      aud: string;
      token?: string;
      "pre-authorized_code"?: string;
    }
  > {
    const didId = await this.didService.getDidId();
    const validatedToken = await validateJwt(idToken);

    // Check required properties first
    if (!validatedToken.iss || !validatedToken.sub || !validatedToken.aud) {
      throw new AppError(
        "Missing required claims in ID token",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    if (validatedToken.aud !== didId) {
      throw new AppError(
        `Audience in ID token claim mismatch ${validatedToken.aud} vs. ${didId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    if (validatedToken.iss !== validatedToken.sub) {
      throw new AppError(
        `Issuer and subject in ID token claim mismatch ${validatedToken.iss} vs. ${validatedToken.sub}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    // Create a properly typed object with the required properties
    return {
      ...validatedToken,
      iss: validatedToken.iss,
      sub: validatedToken.sub,
      aud: validatedToken.aud
    };
  }

  async validateIDTokenWithAccessToken(idToken: string): Promise<{
    tokenPayload: JWTPayload & {
      iss: string;
      sub: string;
      aud: string;
      token: string;
    };
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
      accessToken: validatedToken.token as string
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
      tokenPayload: {
        ...validatedToken,
        token: validatedToken.token
      },
      originalIdToken: siToken
    };
  }
}
