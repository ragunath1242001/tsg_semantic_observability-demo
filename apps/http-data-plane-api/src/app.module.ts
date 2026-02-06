import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AbacModule,
  AuthModule,
  GenericConfigModule,
  LoggerMiddleware,
  RequestContextMiddleware
} from "@tsg-dsp/common-api";

import { ConfigController } from "./config.controller.js";
import { RootConfig } from "./config.js";
import { DataPlaneModule } from "./dataplane/dataplane.module.js";
import { LoggingModule } from "./logging/logging.module.js";
import { TransferModule } from "./transfer/transfer.module.js";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        serveRoot: process.env["SUBPATH"],
        exclude: ["/api/*paths"]
      })
    ]
  : [];

@Module({
  imports: [
    AbacModule.forRoot(),
    DataPlaneModule,
    TransferModule,
    LoggingModule,
    AuthModule,
    GenericConfigModule.register(RootConfig),
    TypeOrmModule.forRoot({
      ...GenericConfigModule.get(RootConfig).db,
      autoLoadEntities: true,
      migrations: [
        `dist/migrations/*-${GenericConfigModule.get(RootConfig).db.type}{.ts,.js}`
      ],
      migrationsRun: !GenericConfigModule.get(RootConfig).db.synchronize
    }),
    ...embeddedFrontend
  ],
  exports: [],
  controllers: [ConfigController]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
