import { Module } from "@nestjs/common";
import { DataPlaneModule } from "./dataplane/dataplane.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { LoggingModule } from "./logging/logging.module.js";
import { ConfigController } from "./config.controller.js";
import { AuthModule, GenericConfigModule } from "@tsg-dsp/common-api";
import { RootConfig } from "./config.js";
import { TransferModule } from "./transfer/transfer.module.js";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        serveRoot: process.env["SUBPATH"],
        exclude: ["/api/(.*)"]
      })
    ]
  : [];

@Module({
  imports: [
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
export class AppModule {}
