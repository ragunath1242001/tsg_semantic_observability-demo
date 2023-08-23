import { Module } from '@nestjs/common';
import { AuthService } from './auth.services.js';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './auth.strategy.js';
import { Clients } from '../model/clients.dao.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import crypto from "crypto";

export const jwtSecret = crypto.randomBytes(48).toString('hex');

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Clients]),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '30m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    LocalStrategy
  ]
})
export class AuthModule {}
