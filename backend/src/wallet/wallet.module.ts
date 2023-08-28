import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service.js';
import { CredentialsController } from './credentials.controller.js';
import { Credentials, DIDDocuments, KeyMaterials } from '../model/credentials.dao.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { PresentationController } from './presentation.controller.js';
import { DIDResolver } from './didResolver.service.js';
import { DidService } from './did.service.js';
import { KeyService } from './keys.service.js';
import { PresentationService } from './presentation.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DIDDocuments]),
    TypeOrmModule.forFeature([KeyMaterials]),
    TypeOrmModule.forFeature([Credentials]),
    AuthModule,
  ],
  controllers: [
    CredentialsController, 
    PresentationController
  ],
  providers: [
    DidService,
    KeyService,
    CredentialsService, 
    PresentationService,
    DIDResolver
  ],
  exports: [
    DidService,
    KeyService,
    CredentialsService, 
    PresentationService,
    DIDResolver
  ]
})
export class WalletModule {}