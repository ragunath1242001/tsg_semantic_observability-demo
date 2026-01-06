import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
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
import { BridgeWsClientModule } from "./bridge/client/bridge-ws-client.module.js";
import { BridgeWsServerModule } from "./bridge/server/bridge-ws-server.module.js";
import { SplitModeModule } from "./bridge/split-mode/split-mode.module.js";
import { ConfigController } from "./config.controller.js";
import { RootConfig } from "./config.js";
import { DataPlaneModule } from "./dataplane/dataplane.module.js";
import { EventsModule } from "./events/events.module.js";
import { FilesModule } from "./files/files.module.js";
import { OrchestrationModule } from "./orchestration/orchestration.module.js";
import { ProjectAgreementsModule } from "./project-agreements/project-agreements.module.js";
import { splitModules } from "./utils/split-mode.js";

const moduleExports = splitModules([DataPlaneModule]);
const runtimeModules = splitModules(
  [
    DataPlaneModule,
    AuthModule,
    AlgorithmInstancesModule,
    ProjectAgreementsModule,
    EventsModule,
    BridgeWsClientModule,
    BridgeWsServerModule
  ],
  [
    AuthModule,
    FilesModule,
    OrchestrationModule,
    AlgorithmInstancesModule,
    EventsModule,
    BridgeWsClientModule
  ],
  [
    DataPlaneModule,
    AuthModule,
    FilesModule,
    OrchestrationModule,
    AlgorithmInstancesModule,
    ProjectAgreementsModule,
    EventsModule,
    BridgeWsClientModule,
    BridgeWsServerModule
  ]
);

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
    EventEmitterModule.forRoot(),
    SplitModeModule,
    ...runtimeModules,
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
  exports: moduleExports,
  controllers: [ConfigController]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer
      .apply(LoggerMiddleware)
      .exclude({
        path: "events/:algorithmInstanceId",
        method: RequestMethod.GET
      })
      .forRoutes("{*path}");
  }
}
