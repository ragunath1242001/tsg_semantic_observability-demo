import { Module } from '@nestjs/common';
import { CredentialsService } from '../services/credentials.service.js';
import { CredentialsManagementController } from './credentialsManagement.controller.js';
import { CredentialsController } from './credentials.controller.js';
import { Credentials, DIDDocuments, KeyMaterials } from '../model/credentials.dao.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([DIDDocuments]),
    TypeOrmModule.forFeature([KeyMaterials]),
    TypeOrmModule.forFeature([Credentials]),
  ],
  controllers: [CredentialsController, CredentialsManagementController],
  providers: [CredentialsService]
})
export class CredentialsModule {}