import { Module } from '@nestjs/common';
import { AuthService } from './auth.services.js';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './auth.strategy.js';
import { Clients } from '../model/clients.dao.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import crypto from "crypto";
import { OidcController } from './oidc.controller.js';
import { AccessToken, AuthorizationCode, BackchannelAuthenticationRequest, Client, ClientCredentials, DeviceCode, Grant, InitialAccessToken, Interaction, PushedAuthorizationRequest, RefreshToken, RegistrationAccessToken, ReplayDetection, Session } from '../model/oidc.dao.js';
import { OidcModule } from 'nest-oidc-provider';
// import { OidcConfigService } from './oidc.service.js';

export const jwtSecret = crypto.randomBytes(48).toString('hex');

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([
      Clients,
      Session,
      AccessToken,
      AuthorizationCode,
      RefreshToken,
      DeviceCode,
      ClientCredentials,
      Client,
      InitialAccessToken,
      RegistrationAccessToken,
      Interaction,
      ReplayDetection,
      PushedAuthorizationRequest,
      Grant,
      BackchannelAuthenticationRequest,
    ]),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '30m' },
    }),
    // OidcModule.forRootAsync({
    //   useClass: OidcConfigService,
    // }),
  ],
  controllers: [
    AuthController,
    OidcController
  ],
  providers: [
    AuthService, 
    LocalStrategy
  ]
})
export class AuthModule {}
