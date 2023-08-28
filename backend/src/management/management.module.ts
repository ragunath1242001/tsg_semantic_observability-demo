import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { CredentialsManagementController } from './credentials.controller.js';
import { KeysManagementController } from './keys.controller.js';
import { ClientsController } from './clients.controller.js';

@Module({
  imports: [
    AuthModule,
    WalletModule,
  ],
  controllers: [
    KeysManagementController,
    CredentialsManagementController,
    ClientsController
  ]
})
export class ManagementModule {}