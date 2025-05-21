import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, ServerConfig, TokenResponse } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { generateKeyPairSync, randomBytes } from "crypto";
import { exportJWK, JWK, SignJWT } from "jose";
import { EqualOperator, FindOptionsWhere, Repository } from "typeorm";

import { OauthClient } from "../model/client.dao.js";
import { KeyDao } from "../model/keys.dao.js";
import { TokenDao } from "../model/token.dao.js";
import { OauthUser } from "../model/user.dao.js";

@Injectable()
export class TokenService {
  constructor(
    private readonly serverConfig: ServerConfig,
    @InjectRepository(KeyDao)
    private readonly keyRepository: Repository<KeyDao>,
    @InjectRepository(TokenDao)
    private readonly tokenRepository: Repository<TokenDao>
  ) {
    this.currentKey = this.fetchOrGenerateKey();
  }
  private currentKey: Promise<JWK>;

  private async fetchOrGenerateKey() {
    const key = await this.keyRepository.findOneBy({
      current: new EqualOperator(true)
    });
    if (key) {
      return key.privateKey;
    } else {
      return this.generateKey();
    }
  }

  private async generateKey() {
    const kid = randomBytes(16).toString("hex");
    const keypair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privateKey = await exportJWK(keypair.privateKey);
    const publicKey = await exportJWK(keypair.publicKey);
    privateKey.kid = kid;
    publicKey.kid = kid;
    await this.keyRepository.save({
      kid,
      privateKey,
      publicKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 31 * 24 * 3600 * 1000),
      current: true
    });
    return privateKey;
  }

  private async rotateKey() {
    await this.keyRepository.update({ current: true }, { current: false });
    const newKey = await this.generateKey();
    this.currentKey = Promise.resolve(newKey);
  }

  private nowInSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  async keySet(): Promise<JWK[]> {
    const keys = await this.keyRepository.find();
    return keys.map((key) => key.publicKey);
  }

  private async createJWT(
    type: "access_token" | "refresh_token",
    client_id: string,
    subject: OauthClient | OauthUser,
    nonce?: string
  ): Promise<string> {
    const subjectId =
      subject instanceof OauthUser ? `${subject.id}` : subject.clientId;

    const claims: Record<string, any> = {
      roles: subject.roles.map((role) => role.name),
      tokenType: type
    };

    if (subject instanceof OauthUser) {
      claims.username = subject.username;
      claims.email = subject.email;
    }

    if (nonce) {
      claims.nonce = nonce;
    }

    const signingKey = await this.currentKey;
    const expiration = type === "access_token" ? 3600 : 24 * 3600;
    const expirationTime = this.nowInSeconds() + expiration;

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: signingKey.kid })
      .setAudience(client_id)
      .setSubject(subjectId)
      .setIssuer(this.serverConfig.publicAddress)
      .setIssuedAt(this.nowInSeconds())
      .setNotBefore(this.nowInSeconds())
      .setExpirationTime(expirationTime)
      .setJti(randomBytes(16).toString("hex"))
      .sign(signingKey);

    return token;
  }

  async createToken(
    clientId: string,
    subject: OauthUser | OauthClient,
    createRefreshToken: boolean,
    userId?: number,
    scope?: string,
    nonce?: string
  ): Promise<TokenResponse> {
    const accessToken = await this.createJWT(
      "access_token",
      clientId,
      subject,
      nonce
    );
    const tokenDao: Partial<TokenDao> = {
      accessToken: accessToken,
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      scope: scope,
      clientId: clientId,
      userId: userId,
      revoked: false
    };
    if (createRefreshToken) {
      tokenDao.refreshToken = await this.createJWT(
        "refresh_token",
        clientId,
        subject
      );
      tokenDao.refreshTokenExpiresAt = new Date(
        Date.now() + 7 * 24 * 3600 * 1000
      );
    }
    await this.tokenRepository.save(tokenDao);
    return plainToInstance(TokenResponse, {
      access_token: accessToken,
      id_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: tokenDao.refreshToken
    });
  }

  async validateToken(token: string, type: string) {
    const where: FindOptionsWhere<TokenDao> =
      type === "access_token"
        ? { accessToken: token }
        : { refreshToken: token };
    const storedToken = await this.tokenRepository.findOneBy(where);
    if (!storedToken) {
      throw new AppError("Invalid token", HttpStatus.BAD_REQUEST);
    }
    const expiresAt =
      type === "access_token"
        ? storedToken.accessTokenExpiresAt
        : storedToken.refreshTokenExpiresAt!;
    if (new Date() > expiresAt) {
      throw new AppError("Token expired", HttpStatus.BAD_REQUEST);
    }
    if (storedToken.revoked) {
      throw new AppError("Token revoked", HttpStatus.BAD_REQUEST);
    }
    return storedToken;
  }

  async revokeToken(token: string, token_type_hint: string = "access_token") {
    const storedToken = await this.validateToken(token, token_type_hint);
    await this.tokenRepository.save({
      ...storedToken,
      revoked: true
    });
  }
}
