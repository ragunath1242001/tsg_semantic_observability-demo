import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DataPlaneModule } from "./data-plane/dataplane.module.js";
import { ScheduleModule } from "@nestjs/schedule";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging.js";
import { AuthModule } from "./auth/auth.module.js";
import { ConfigModule, config } from "./config.module.js";
import { HealthController } from "./health.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DspClientModule } from "./dsp/client/client.module.js";
import { CatalogModule } from "./dsp/catalog/catalog.module.js";
import { NegotiationModule } from "./dsp/negotiation/negotiation.module.js";
import { TransferModule } from "./dsp/transfer/transfer.module.js";
import { RegistryModule } from "./registry/registry.module.js";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ConfigController } from "./config.controller.js";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TerminusModule } from "@nestjs/terminus";
import { StatusController } from "./status.controller.js";
import { NegotiationDetailDao } from "./model/negotiation.dao.js";
import { TransferDetailDao } from "./model/transfer.dao.js";

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
    EventEmitterModule.forRoot(),
    AuthModule,
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      migrations: [`dist/migrations/*-${config.db.type}{.ts,.js}`],
      migrationsRun: !config.db.synchronize
    }),
    TypeOrmModule.forFeature([NegotiationDetailDao, TransferDetailDao]),
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule,
    ...embeddedFrontend,
    RegistryModule.register(config.registry),
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
    consumer.apply(RequestContextMiddleware).forRoutes("*");
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
