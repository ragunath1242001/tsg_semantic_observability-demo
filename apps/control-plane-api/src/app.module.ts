import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
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
import { RootConfig } from "./config.js";
import { DataPlaneModule } from "./data-plane/dataplane.module.js";
import { CatalogModule } from "./dsp/catalog/catalog.module.js";
import { DspClientModule } from "./dsp/client/client.module.js";
import { NegotiationModule } from "./dsp/negotiation/negotiation.module.js";
import { TransferModule } from "./dsp/transfer/transfer.module.js";
import { NegotiationDetailDao } from "./model/negotiation.dao.js";
import { TransferDetailDao } from "./model/transfer.dao.js";
import { RegistryModule } from "./registry/registry.module.js";
import { StatusController } from "./status.controller.js";
import { VCAuthModule } from "./vc-auth/vc.auth.module.js";

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
    EventEmitterModule.forRoot(),
    GenericConfigModule.register(RootConfig),
    TypeOrmModule.forRoot({
      ...GenericConfigModule.get(RootConfig).db,
      autoLoadEntities: true,
      migrations: [
        `dist/migrations/*-${GenericConfigModule.get(RootConfig).db.type}{.ts,.js}`
      ],
      migrationsRun: !GenericConfigModule.get(RootConfig).db.synchronize
    }),
    AuthModule,
    VCAuthModule,
    TypeOrmModule.forFeature([NegotiationDetailDao, TransferDetailDao]),
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule,
    ...embeddedFrontend,
    RegistryModule.register(),
    TerminusModule
  ],
  exports: [
    AuthModule,
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule
  ],
  controllers: [ConfigController, HealthController, StatusController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
