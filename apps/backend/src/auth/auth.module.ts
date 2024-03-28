import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./local.strategy.js";
import { Clients } from "../model/clients.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller.js";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { AccessTokenStrategy } from "./accessToken.strategy.js";
import { RefreshTokenStrategy } from "./refreshToken.strategy.js";
import { MailService } from "./mail.service.js";
import { ClientsController } from "./clients.management.controller.js";
import { ClientsService } from "./client.service.js";

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Clients]),
    JwtModule.register({}),
  ],
  controllers: [AuthController, ClientsController],
  providers: [
    LocalStrategy,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    MailService,
    ClientsService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [ClientsService],
})
export class AuthModule {}
