import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { FilesModule } from "./files/files.module.js";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigController } from "./config.controller.js";
import { AuthModule, GenericConfigModule } from "@tsg-dsp/common-api";
import { RootConfig } from "./config.js";

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
    ScheduleModule.forRoot(),
    DataPlaneTestModule,
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
    ...embeddedFrontend,
    FilesModule.register(GenericConfigModule.get(RootConfig).files)
  ],
  exports: [DataPlaneTestModule],
  controllers: [ConfigController]
})
export class AppModule {}
