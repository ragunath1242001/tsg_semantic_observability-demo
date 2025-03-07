import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TerminusModule } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthModule,
  GenericConfigModule,
  HealthController,
  LoggerMiddleware,
  RequestContextMiddleware
} from "@tsg-dsp/common-api";

import { ConfigController } from "./config.controller.js";
import { PresentationConfig, RootConfig } from "./config.js";
import { ContextModule } from "./contexts/context.module.js";
import { CredentialsModule } from "./credentials/credentials.module.js";
import { DidModule } from "./did/did.module.js";
import { IssuanceModule } from "./issuance/issuance.module.js";
import { KeysModule } from "./keys/keys.module.js";
import { CredentialDao, KeyMaterialDao } from "./model/credentials.dao.js";
import { CredentialIssuance } from "./model/issuance.dao.js";
import { PresentationModule } from "./presentation/presentation.module.js";
import { StatusController } from "./status.controller.js";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        serveRoot: process.env["SUBPATH"],
        exclude: ["/api/*paths", "/.well-known/*paths"]
      })
    ]
  : [];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GenericConfigModule.register(RootConfig),
    TypeOrmModule.forRoot({
      ...GenericConfigModule.get(RootConfig).db,
      autoLoadEntities: true,
      migrations: [
        `dist/migrations/*-${GenericConfigModule.get(RootConfig).db.type}{.ts,.js}`
      ],
      migrationsRun: !GenericConfigModule.get(RootConfig).db.synchronize
    }),
    TypeOrmModule.forFeature([
      CredentialIssuance,
      CredentialDao,
      KeyMaterialDao
    ]),
    TerminusModule,
    PresentationModule.register(GenericConfigModule.get(PresentationConfig)),
    AuthModule,
    ContextModule,
    CredentialsModule,
    DidModule,
    KeysModule,
    IssuanceModule,
    ...embeddedFrontend
  ],
  controllers: [HealthController, ConfigController, StatusController],
  exports: [CredentialsModule, DidModule, IssuanceModule, KeysModule]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
