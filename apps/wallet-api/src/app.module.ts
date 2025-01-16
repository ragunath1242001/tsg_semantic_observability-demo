import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { CredentialsModule } from "./credentials/credentials.module.js";
import { DidModule } from "./did/did.module.js";
import { IssuanceModule } from "./issuance/issuance.module.js";
import { KeysModule } from "./keys/keys.module.js";
import { PresentationModule } from "./presentation/presentation.module.js";
import { ConfigController } from "./config.controller.js";
import { ContextModule } from "./contexts/context.module.js";
import { Credentials, KeyMaterials } from "./model/credentials.dao.js";
import { CredentialIssuance } from "./model/issuance.dao.js";
import { TerminusModule } from "@nestjs/terminus";
import { StatusController } from "./status.controller.js";
import { PresentationConfig, RootConfig } from "./config.js";
import {
  GenericConfigModule,
  AuthModule,
  HealthController,
  RequestContextMiddleware,
  LoggerMiddleware
} from "@tsg-dsp/common-api";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        serveRoot: process.env["SUBPATH"],
        exclude: ["/api/(.*)", "/.well-known/(.*)"]
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
    TypeOrmModule.forFeature([CredentialIssuance, Credentials, KeyMaterials]),
    PresentationModule.register(GenericConfigModule.get(PresentationConfig)),
    AuthModule.register(RootConfig),
    ContextModule,
    CredentialsModule,
    DidModule,
    KeysModule,
    IssuanceModule,
    ...embeddedFrontend,
    TerminusModule
  ],
  controllers: [HealthController, ConfigController, StatusController],
  exports: [CredentialsModule, DidModule, IssuanceModule, KeysModule]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
