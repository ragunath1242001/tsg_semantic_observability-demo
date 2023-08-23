import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { CredentialsManagementController } from './credentials.controller.js';
import { DidManagementController } from './did.controller.js';
import { KeysManagementController } from './keys.controller.js';

@Module({
  imports: [
    AuthModule,
    WalletModule
  ],
  controllers: [
    DidManagementController,
    KeysManagementController,
    CredentialsManagementController,
  ]
})
export class ManagementModule {}