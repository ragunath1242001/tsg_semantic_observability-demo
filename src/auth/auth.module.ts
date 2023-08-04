import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, DidService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, DidService]
})
export class AuthModule {}
