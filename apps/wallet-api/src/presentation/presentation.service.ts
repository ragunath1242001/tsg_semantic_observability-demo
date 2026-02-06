import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, Paginated, PaginationOptionsDto } from "@tsg-dsp/common-api";
import {
  EnvelopedVerifiableCredential,
  EnvelopedVerifiablePresentation,
  PresentationValidation,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import {
  DcqlQuery,
  OID4VPAuthorizationResponse,
  PresentationDefinition
} from "@tsg-dsp/common-dtos";
import {
  evaluatePresentationResponseValidity,
  verifyCredentialStatusValidity,
  verifyCredentialValidity,
  verifyPresentationValidity
} from "@tsg-dsp/common-signing-and-validation";
import { AddScope, ScopeDto } from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import { SignatureService } from "../keys/signature.service.js";
import { CredentialDao } from "../model/credentials.dao.js";
import { ScopeDao } from "../model/scopes.dao.js";
import { DEFAULT_SCOPES } from "./default-scopes.js";

@Injectable()
export class PresentationService {
  constructor(
    private readonly config: RootConfig,
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly didService: DidService,
    @InjectRepository(ScopeDao)
    private readonly scopeRepository: Repository<ScopeDao>
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);
  readonly initialized: Promise<void>;

  async init() {
    try {
      const count = await this.scopeRepository.count();
      if (count === 0) {
        this.logger.log("No scopes found, creating initial scopes");
        const scopes = DEFAULT_SCOPES;
        for (const scope of this.config.initScopes) {
          const index = scopes.findIndex(
            (defaultScope) => defaultScope.alias === scope.alias
          );
          if (index >= 0) {
            scopes[index] = scope;
          } else {
            scopes.push(scope);
          }
        }
        this.logger.log(`Adding ${scopes.length} scopes`);
        await Promise.allSettled(
          scopes.map(async (scope) => {
            await this.addScope(scope);
          })
        );
      }
    } catch (error) {
      this.logger.warn(`Error initializing scopes: ${error}`);
      this.logger.debug(error);
    }
  }

  async getScopes(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<ScopeDto[]>> {
    const [scopes, total] = await this.scopeRepository.findAndCount(
      paginationOptions.typeOrm
    );
    return {
      data: scopes.map((scope) => plainToInstance(ScopeDto, scope)),
      total
    };
  }

  async getScope(alias: string): Promise<ScopeDao> {
    const scope = await this.scopeRepository.findOneBy({ alias });
    if (!scope) {
      throw new AppError(
        `Scope with alias ${alias} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    return scope;
  }

  async interpretScope(scopeString: string): Promise<PresentationDefinition> {
    const [alias, ...discriminators] = scopeString.split(":");
    const scope = await this.getScope(alias);

    let template = JSON.stringify(scope.presentationDefinition);
    const discriminatorVars = scope.discriminator.split(":");

    if (discriminatorVars.length !== discriminators.length) {
      throw new AppError(
        `Scope discriminator mismatch: expected ${discriminatorVars.length} values, got ${discriminators.length}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    for (const [i, discriminatorVar] of discriminatorVars.entries()) {
      template = template.replace(
        discriminatorVar,
        decodeURIComponent(discriminators[i])
      );
    }
    const presentationDefinition = plainToInstance(
      PresentationDefinition,
      JSON.parse(template)
    );
    presentationDefinition.id = scopeString;
    return presentationDefinition;
  }

  async addScope(scope: AddScope): Promise<ScopeDto> {
    this.logger.debug(`Adding scope ${scope.alias}`);
    const existing = await this.scopeRepository.findOneBy({
      alias: scope.alias
    });
    if (existing) {
      throw new AppError(
        `Scope with alias ${scope.alias} already exists`,
        HttpStatus.CONFLICT
      ).andLog(this.logger);
    }
    const scopeDao = await this.scopeRepository.save(
      this.scopeRepository.create(scope)
    );
    return plainToInstance(ScopeDto, scopeDao);
  }

  async updateScope(id: string, scope: AddScope): Promise<ScopeDto> {
    this.logger.debug(`Updating scope with id ${id} and alias ${scope.alias}`);
    const existing = await this.scopeRepository.findOneBy({ id });
    if (!existing) {
      throw new AppError(
        `Scope with id ${id} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    if (scope.alias && scope.alias !== existing.alias) {
      const aliasExists = await this.scopeRepository.findOneBy({
        alias: scope.alias
      });
      if (aliasExists) {
        throw new AppError(
          `Scope with alias ${scope.alias} already exists`,
          HttpStatus.CONFLICT
        ).andLog(this.logger);
      }
    }
    const updated = this.scopeRepository.save(
      this.scopeRepository.create({
        id: existing.id,
        ...scope
      })
    );
    return plainToInstance(ScopeDto, updated);
  }

  async deleteScope(id: string): Promise<void> {
    const existing = await this.scopeRepository.findOneBy({ id });
    if (!existing) {
      throw new AppError(
        `Scope with id ${id} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    this.logger.debug(
      `Deleting scope with id ${id} and alias ${existing.alias}`
    );
    await this.scopeRepository.remove(existing);
  }

  async createVerifiablePresentationJsonLd(
    credentials: string | CredentialDao[],
    unwrap: boolean
  ): Promise<VerifiablePresentationJsonLd> {
    let vcs: CredentialDao[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential =
        await this.credentialsService.getCredential(credentials);
      vcs = [credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? this.convertDaoToCredential(vcs[0])
        : vcs.map((c) => this.convertDaoToCredential(c))
    };
    const proof = await this.signatureService.signAsDataIntegrityProof(
      "RDFC",
      verifiablePresentation
    );
    verifiablePresentation.proof = proof;
    return plainToInstance(VerifiablePresentationJsonLd, {
      vp: verifiablePresentation
    });
  }

  private convertDaoToCredential(
    credentialDao: CredentialDao
  ): VerifiableCredential | EnvelopedVerifiableCredential {
    if (credentialDao.jwt) {
      return {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: `data:application/vc+jwt,${credentialDao.jwt}`,
        type: ["EnvelopedVerifiableCredential"]
      };
    } else {
      return plainToInstance(VerifiableCredential, {
        ...credentialDao.credential,
        proof: credentialDao.proof
      });
    }
  }

  async createVerifiablePresentationJwt(
    credentials: string | CredentialDao[],
    audience: string,
    unwrap: boolean,
    format: "vp+jwt" | "enveloped" | "jwt_vp" = "vp+jwt",
    nonce?: string
  ): Promise<VerifiablePresentationJwt> {
    let vcs: CredentialDao[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential =
        await this.credentialsService.getCredential(credentials);
      vcs = [credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? this.convertDaoToCredential(vcs[0])
        : vcs.map((c) => this.convertDaoToCredential(c))
    };
    let jwt: string;
    switch (format) {
      case "jwt_vp":
        jwt = await this.createJwtVerifiablePresentation(
          verifiablePresentation,
          audience,
          nonce
        );
        break;
      case "vp+jwt":
        jwt = await this.createVerifiablePresentationJose(
          verifiablePresentation,
          audience,
          nonce
        );
        break;
      case "enveloped":
        jwt = await this.createEnvelopedVerifiablePresentation(
          verifiablePresentation,
          audience,
          nonce
        );
        break;
    }
    return plainToInstance(VerifiablePresentationJwt, {
      vp: jwt
    });
  }

  // https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose
  private async createVerifiablePresentationJose(
    verifiablePresentation: VerifiablePresentation,
    audience: string,
    nonce?: string
  ): Promise<string> {
    return await this.signatureService.signContainerAsJwt(
      verifiablePresentation,
      {
        audience,
        iat: true,
        expiresIn: 24 * 60 * 60, // 24 hours
        iss: true,
        nonce,
        typ: "vp+jwt",
        cty: "vp"
      }
    );
  }

  // https://www.w3.org/TR/vc-jose-cose/#securing-vps-with-jose
  private async createEnvelopedVerifiablePresentation(
    verifiablePresentation: VerifiablePresentation,
    audience: string,
    nonce?: string
  ): Promise<string> {
    const vpJwt = await this.createVerifiablePresentationJose(
      verifiablePresentation,
      audience
    );
    const envelopedVerifiablePresentation: EnvelopedVerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      id: `data:application/vp+jwt,${vpJwt}`,
      type: ["EnvelopedVerifiablePresentation"]
    };
    return await this.signatureService.signContainerAsJwt(
      envelopedVerifiablePresentation,
      {
        audience,
        iat: true,
        expiresIn: 24 * 60 * 60, // 24 hours
        iss: true,
        nonce,
        typ: "vp+jwt",
        cty: "vp"
      }
    );
  }

  // https://identity.foundation/jwt-vc-presentation-profile/
  private async createJwtVerifiablePresentation(
    verifiablePresentation: VerifiablePresentation,
    audience: string,
    nonce?: string
  ): Promise<string> {
    return await this.signatureService.signAsJwt(
      { vp: verifiablePresentation, nonce },
      audience,
      {
        expirationTime: 24 * 60 * 60, // 24 hours
        jti: crypto.randomUUID()
      }
    );
  }

  async validatePresentation(
    vpJwt: VerifiablePresentationJwt,
    audience?: string
  ): Promise<PresentationValidation> {
    return verifyPresentationValidity(
      vpJwt,
      this.config?.trustAnchors ? this.config.trustAnchors : [],
      audience
    );
  }

  async validateCredential(credential: VerifiableCredential): Promise<{
    validExpiryDate: boolean;
    validTrustAnchors: boolean;
    validProof: boolean;
    validStatus: boolean;
  }> {
    return await verifyCredentialValidity(
      credential,
      this.config?.trustAnchors ? this.config.trustAnchors : []
    );
  }

  async verifyCredentialStatus(
    statusListCredential: string,
    position: string,
    disableCache: boolean = false
  ) {
    return await verifyCredentialStatusValidity(
      statusListCredential,
      position,
      disableCache,
      this.config?.trustAnchors ? this.config.trustAnchors : []
    );
  }

  public async evaluatePresentationResponse(
    dcqlQuery: DcqlQuery,
    response: OID4VPAuthorizationResponse,
    audience?: string,
    nonce?: string
  ): Promise<VerifiablePresentation[]> {
    this.logger.log(`Evaluating presentation response`);
    this.logger.debug(`VP token: ${response.vp_token}`);
    this.logger.debug(`DCQL Query: ${JSON.stringify(dcqlQuery)}`);
    this.logger.debug(`Response: ${JSON.stringify(response)}`);
    return await evaluatePresentationResponseValidity(
      dcqlQuery,
      response,
      this.config?.trustAnchors ? this.config.trustAnchors : [],
      audience,
      nonce
    );
  }
}
