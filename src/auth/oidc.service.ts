// import { Injectable } from "@nestjs/common";
// import { InjectDataSource } from "@nestjs/typeorm";
// import { OidcModuleOptions, OidcModuleOptionsFactory } from "nest-oidc-provider";
// import { Adapter, AdapterFactory, AdapterPayload, Configuration } from "oidc-provider";
// import { DataSource, DeepPartial, ObjectLiteral, Repository } from "typeorm";
// import { AccessToken, AuthorizationCode, BackchannelAuthenticationRequest, Client, ClientCredentials, DeviceCode, Grant, InitialAccessToken, Interaction, OidcEntity, PushedAuthorizationRequest, RefreshToken, RegistrationAccessToken, ReplayDetection, Session } from "../model/oidc.dao.js";
// import { exportJWK, generateKeyPair } from "jose";
// import { RootConfig } from "../config.js";
// import crypto from "crypto";

// @Injectable()
// export class OidcConfigService implements OidcModuleOptionsFactory {
//   private readonly repositories: Record<string, Repository<OidcEntity>>
//   constructor(
//     @InjectDataSource() private readonly dataSource: DataSource,
//     private readonly config: RootConfig
//   ) {
//     this.repositories = {
//       'Session': this.dataSource.getRepository(Session),
//       'AccessToken': this.dataSource.getRepository(AccessToken),
//       'AuthorizationCode': this.dataSource.getRepository(AuthorizationCode),
//       'RefreshToken': this.dataSource.getRepository(RefreshToken),
//       'DeviceCode': this.dataSource.getRepository(DeviceCode),
//       'ClientCredentials': this.dataSource.getRepository(ClientCredentials),
//       'Client': this.dataSource.getRepository(Client),
//       'InitialAccessToken': this.dataSource.getRepository(InitialAccessToken),
//       'RegistrationAccessToken': this.dataSource.getRepository(RegistrationAccessToken),
//       'Interaction': this.dataSource.getRepository(Interaction),
//       'ReplayDetection': this.dataSource.getRepository(ReplayDetection),
//       'PushedAuthorizationRequest': this.dataSource.getRepository(PushedAuthorizationRequest),
//       'Grant': this.dataSource.getRepository(Grant),
//       'BackchannelAuthenticationRequest': this.dataSource.getRepository(BackchannelAuthenticationRequest),
//     }
//   }

//   async createModuleOptions(): Promise<OidcModuleOptions> {
//     const keypair = await generateKeyPair('EdDSA');
//     const configuration: Configuration = {
//       // ... see the available options in Configuration options section
//       clients: [{
//         client_id: 'foo',
//         client_secret: 'bar',
//         redirect_uris: [
//           this.config.server.publicAddress, 
//           'https://oidcdebugger.com/debug'
//         ],
//         grant_types: ['implicit', 'refresh_token', 'authorization_code', 'client_credentials'],
//         id_token_signed_response_alg: 'EdDSA',
//         response_types: ['code', 'code id_token', 'id_token'],
        
//         // + other client properties
//       }],
      
//       findAccount(ctx, id, token) {
//         return {
//           accountId: id,
//           claims(use, scope, claims, rejected) {
//             return {
//               sub: id
//             }
//           },
//         }
//       },
//       cookies: {
//         keys: [crypto.randomBytes(48).toString('hex')]
//       },
//       claims: {
//         email: ['email', 'email_verified'],
//         identity: ['identifier']
//       },
//       features: {
//         deviceFlow: { enabled: true },
//         clientCredentials: { enabled: true }
      
//       },
//       jwks: {
//         keys: [
//           await exportJWK(keypair.privateKey)
//         ]
//       }
//       // ...
//     }
//     return {
//       issuer: this.config.server.publicAddress,
//       path: '/oidc',
//       oidc: configuration, // oidc-provider configuration
//     };
//   }

//   createAdapterFactory?(): AdapterFactory {
//     return (modelName: string) => new TypeOrmAdapter(modelName, this.repositories[modelName]);
//   }
// }


