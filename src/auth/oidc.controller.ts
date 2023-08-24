import { Controller, All, Req, Res, HttpStatus, Session, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import Provider, { Adapter, AdapterPayload, Configuration } from 'oidc-provider';
import { RootConfig } from '../config.js';
import crypto from "crypto";
import { exportJWK, generateKeyPair } from 'jose';
import { AppError } from '../utils/error.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import { OidcEntity, AccessToken, AuthorizationCode, RefreshToken, DeviceCode, ClientCredentials, Client, InitialAccessToken, RegistrationAccessToken, Interaction, ReplayDetection, PushedAuthorizationRequest, Grant, BackchannelAuthenticationRequest } from '../model/oidc.dao.js';

@Controller('oidc')
export class OidcController {
  callback?: (req: IncomingMessage | Http2ServerRequest, res: Http2ServerResponse | ServerResponse<IncomingMessage>) => Promise<void>;
  private readonly repositories: Record<string, Repository<OidcEntity>>
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: RootConfig,
  ) {
    this.init();
    this.repositories = {
      'Session': this.dataSource.getRepository(Session),
      'AccessToken': this.dataSource.getRepository(AccessToken),
      'AuthorizationCode': this.dataSource.getRepository(AuthorizationCode),
      'RefreshToken': this.dataSource.getRepository(RefreshToken),
      'DeviceCode': this.dataSource.getRepository(DeviceCode),
      'ClientCredentials': this.dataSource.getRepository(ClientCredentials),
      'Client': this.dataSource.getRepository(Client),
      'InitialAccessToken': this.dataSource.getRepository(InitialAccessToken),
      'RegistrationAccessToken': this.dataSource.getRepository(RegistrationAccessToken),
      'Interaction': this.dataSource.getRepository(Interaction),
      'ReplayDetection': this.dataSource.getRepository(ReplayDetection),
      'PushedAuthorizationRequest': this.dataSource.getRepository(PushedAuthorizationRequest),
      'Grant': this.dataSource.getRepository(Grant),
      'BackchannelAuthenticationRequest': this.dataSource.getRepository(BackchannelAuthenticationRequest),
    }
  }

  async init() {
    const keypair = await generateKeyPair('EdDSA');
    const configuration: Configuration = {
      // ... see the available options in Configuration options section
      
      clients: [{
        client_id: 'foo',
        client_secret: 'bar',
        redirect_uris: [
          this.config.server.publicAddress, 
          'https://oidcdebugger.com/debug'
        ],
        grant_types: ['implicit', 'refresh_token', 'authorization_code', 'client_credentials', 'urn:ietf:params:oauth:grant-type:device_code'],
        id_token_signed_response_alg: 'EdDSA',
        response_types: [
          // 'code', 
          // 'code id_token', 
          'id_token'],
        scope: 'openid',
        

        // + other client properties
      }],
      
      
      findAccount(ctx, id, token) {
        return {
          accountId: id,
          claims(use, scope, claims, rejected) {
            return {
              sub: id,
              email: 'test@test.com',
              email_verified: 'true',
              identifier: 'SCSN1234',
            }
          },
        }
      },
      cookies: {
        keys: [crypto.randomBytes(48).toString('hex')]
      },
      claims: {
        email: ['email', 'email_verified'],
        identity: ['identifier']
      },
      subjectTypes: ['pairwise', 'public'],
      acrValues: ['0', '1', '2'],
      pairwiseIdentifier: (ctx, accountId, client) => `${accountId}-pairwise`,
      features: {
        deviceFlow: { enabled: true },
        clientCredentials: { enabled: true },
        resourceIndicators: {
          getResourceServerInfo(ctx, resourceIndicator) {
            const [, wl, format] = resourceIndicator.split(':');
            return {
              scope: 'openid',
              accessTokenFormat: 'jwt',
              audience: 'account'
            }
          },
          defaultResource(ctx) {
            return 'urn:wl:jwt:default'
          }
        },
        backchannelLogout: { enabled: true },
        claimsParameter: { enabled: true },
        requestObjects: { request: false, requestUri: true },
        rpInitiatedLogout: { enabled: false },
        pushedAuthorizationRequests: { enabled: false },
      },
      jwks: {
        keys: [
          await exportJWK(keypair.privateKey)
        ]
      },
      pkce: {
        required: () => false,
      },
      adapter: (modelName: string) => {
        return new TypeOrmAdapter(modelName, this.repositories[modelName])
      },
      clientDefaults: {
        grant_types: ['implicit', 'refresh_token', 'authorization_code', 'client_credentials'],
        // token_endpoint_auth_signing_alg: 'EdDSA',
        backchannel_authentication_request_signing_alg: 'EdDSA',
        id_token_signed_response_alg: 'EdDSA',
      }
      // ...
    };
    
    const oidc = new Provider('http://localhost:3000', configuration);
    const { invalidate: orig } = (oidc.Client as any).Schema.prototype;
    (oidc.Client as any).Schema.prototype.invalidate = function invalidate(message: any, code: string) {
      if (code === 'implicit-force-https' || code === 'implicit-forbid-localhost') {
        return;
      }
      orig.call(this, message);
    };
    this.callback = oidc.callback();
  }

  @All('/*')
  async mountedOidc(@Req() req: Request, @Res() res: Response): Promise<void> {
    req.url = req.originalUrl.replace('/oidc', '');
    if (!this.callback) {
      throw new AppError('OpenID Connector provider not yet loaded', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.callback(req, res);
  }
}

class TypeOrmAdapter implements Adapter {
  constructor(private readonly name: string, private readonly repository: Repository<ObjectLiteral>) {
    this.logger.log(`Creating TypeOrmAdapted for OIDC for model ${name}`)
  }
  private readonly logger = new Logger(this.constructor.name);

  async upsert(id: string, payload: any, expiresIn: number): Promise<void | undefined> {
    this.logger.log(`Upsert: ${this.name} ${id} ${JSON.stringify(payload)} ${expiresIn}`);
    try {
    await this.repository.save({
      id,
      data: payload,
      ...(payload.grantId ? { grantId: payload.grantId } : undefined),
      ...(payload.userCode ? { userCode: payload.userCode } : undefined),
      ...(payload.uid ? { uid: payload.uid } : undefined),
      ...(expiresIn ? { expiresAt: new Date(Date.now() + (expiresIn * 1000)) } : undefined),
    })
  } catch (err) {
    this.logger.log(err);
    throw err
  }
  }
  async find(id: string): Promise<void | AdapterPayload | undefined> {
    this.logger.log(`Find: ${this.name} ${id}`);
    const found = await this.repository.findOneBy({id: id});
    if (!found) return undefined;
    return {
      ...found.data,
      ...(found.consumedAt ? { consumed: true } : undefined)
    }
  }
  async findByUserCode(userCode: string): Promise<void | AdapterPayload | undefined> {
    this.logger.log(`findByUserCode: ${this.name} ${userCode}`);
    const found = await this.repository.findOneBy({userCode: userCode});
    if (!found) return undefined;
    return {
      ...found.data,
      ...(found.consumedAt ? { consumed: true } : undefined)
    }
  }
  async findByUid(uid: string): Promise<void | AdapterPayload | undefined> {
    this.logger.log(`findByUid: ${this.name} ${uid}`);
    const found = await this.repository.findOneBy({uid: uid});
    if (!found) return undefined;
    return {
      ...found.data,
      ...(found.consumedAt ? { consumed: true } : undefined)
    }
  }
  async consume(id: string): Promise<void | undefined> {
    this.logger.log(`consume: ${this.name} ${id}`);
    await this.repository.update({id: id}, {consumedAt: new Date()});
  }
  async destroy(id: string): Promise<void | undefined> {
    this.logger.log(`destroy: ${this.name} ${id}`);
    await this.repository.delete({id: id});
  }
  async revokeByGrantId(grantId: string): Promise<void | undefined> {
    this.logger.log(`revokeByGrantId: ${this.name} ${grantId}`);
    await this.repository.delete({grantId: grantId});
  }
}