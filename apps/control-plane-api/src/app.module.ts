import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TerminusModule } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AbacModule,
  AuditLogModule,
  AuthModule,
  createAuditLogController,
  GenericConfigModule,
  HealthController,
  LoggerMiddleware,
  RequestContextMiddleware,
  toTypeOrmType
} from "@tsg-dsp/common-api";
import { Resource } from "@tsg-dsp/common-dtos";

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
import { SemanticObservabilityModule } from "./semantic-observability/semantic-observability.module.js";
import { SessionModule } from "./session.module.js";
import { StatusController } from "./status.controller.js";
import { VCAuthModule } from "./vc-auth/vc.auth.module.js";
import { VersionsController } from "./versions.controller.js";

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
    SessionModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    GenericConfigModule.register(RootConfig),
    TypeOrmModule.forRoot({
      ...GenericConfigModule.get(RootConfig).db,
      type: toTypeOrmType(GenericConfigModule.get(RootConfig).db.type),
      autoLoadEntities: true,
      migrations: [
        `dist/migrations/*-${GenericConfigModule.get(RootConfig).db.type}{.ts,.js}`
      ],
      migrationsRun: !GenericConfigModule.get(RootConfig).db.synchronize
    }),
    AbacModule.forRoot(),
    AuditLogModule,
    AuthModule,
    VCAuthModule,
    TypeOrmModule.forFeature([NegotiationDetailDao, TransferDetailDao]),
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule,
    SemanticObservabilityModule,
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
  controllers: [
    createAuditLogController(Resource.CP_AUDIT_LOG),
    VersionsController,
    ConfigController,
    HealthController,
    StatusController
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
