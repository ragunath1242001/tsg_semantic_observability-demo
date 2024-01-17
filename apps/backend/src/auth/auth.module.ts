import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifiablePresentationGuard } from './verifiablePresentation.guard';
import { ManagementGuard } from './management.guard';
import { VerifiablePresentationStrategy } from './verifiablePresentation.strategy';
import { ManagementStrategy } from './management.strategy';

@Module({
  providers: [
    AuthService,
    VerifiablePresentationGuard,
    VerifiablePresentationStrategy,
    ManagementGuard,
    ManagementStrategy
  ],
  exports: [
    AuthService,
    VerifiablePresentationGuard,
    VerifiablePresentationStrategy,
    ManagementGuard,
    ManagementStrategy
  ]
})
export class AuthModule {}
