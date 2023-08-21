import { Module } from '@nestjs/common';
import { CredentialsService } from '../services/credentials.service';
import { CredentialsManagementController } from './credentialsManagement.controller';
import { CredentialsController } from './credentials.controller';
import { OidcController } from './oidc.controller';

@Module({
  controllers: [CredentialsController, CredentialsManagementController, OidcController],
  providers: [CredentialsService]
})
export class CredentialsModule {}