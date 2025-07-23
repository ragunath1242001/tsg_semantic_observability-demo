import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthModule,
  GenericConfigModule,
  LoggerMiddleware,
  RequestContextMiddleware
} from "@tsg-dsp/common-api";

import { AlgorithmInstancesModule } from "./algorithm-instances/algorithm-instances.module.js";
import { ConfigController } from "./config.controller.js";
import { RootConfig } from "./config.js";
import { DataPlaneTestModule } from "./dataplane/dataplane.module.js";
import { EventsModule } from "./events/events.module.js";
import { FilesModule } from "./files/files.module.js";
import { OrchestrationModule } from "./orchestration/orchestration.module.js";

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
    ScheduleModule.forRoot(),
    DataPlaneTestModule,
    AuthModule,
    FilesModule,
    OrchestrationModule,
    AlgorithmInstancesModule,
    EventsModule,
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
  exports: [DataPlaneTestModule],
  controllers: [ConfigController]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
