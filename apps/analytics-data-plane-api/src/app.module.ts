import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module.js";
import { ConfigModule, config } from "./config.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { AuthModule } from "./auth/auth.module.js";
import { FilesModule } from "./files/files.module.js";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigController } from "./config.controller.js";

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
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      migrations: [`dist/migrations/*-${config.db.type}{.ts,.js}`],
      migrationsRun: !config.db.synchronize
    }),
    ...embeddedFrontend,
    FilesModule.register(config.files)
  ],
  exports: [DataPlaneTestModule, AuthModule],
  controllers: [ConfigController]
})
export class AppModule {}
