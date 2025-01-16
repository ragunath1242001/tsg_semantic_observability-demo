import { DynamicModule, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { OAuthBearerStrategy } from "./oauth.bearer.strategy.js";
import { OAuthStrategy } from "./oauth.strategy.js";
import { SessionSerializer } from "./session.serializer.js";
import { OAuthGuard } from "./oauth.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { AuthClientService } from "./auth.client.service.js";
import { GenericConfigModule } from "../config/config.module.js";
import { ClassConstructor } from "class-transformer";

// @Module({
//   imports: [PassportModule.register({ session: true })],
//   controllers: [AuthController],
//   providers: [
//     ...(GenericConfigModule.get(AuthConfig).enabled
//       ? [OAuthStrategy, OAuthBearerStrategy]
//       : []),
//     AuthClientService,
//     SessionSerializer,
//     OAuthGuard.asGlobalGuard(),
//     RolesGuard.asGlobalGuard()
//   ],
//   exports: [AuthClientService]
// })
export class AuthModule {
  static register(configClass: ClassConstructor<any>): DynamicModule {
    return {
      module: AuthModule,
      imports: [PassportModule.register({ session: true })],
      controllers: [AuthController],
      providers: [
        ...(GenericConfigModule.get(configClass).auth.enabled
          ? [OAuthStrategy, OAuthBearerStrategy]
          : []),
        AuthClientService,
        SessionSerializer,
        OAuthGuard.asGlobalGuard(),
        RolesGuard.asGlobalGuard()
      ],
      exports: [AuthClientService]
    };
  }
}
