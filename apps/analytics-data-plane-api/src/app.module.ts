import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module";
import { ConfigModule, config } from "./config.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { AuthModule } from "./auth/auth.module";
import { FilesModule } from "./files/files.module";
import { ScheduleModule } from "@nestjs/schedule";

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
    // LoggingModule,
    AuthModule,
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      synchronize: true
    }),
    ...embeddedFrontend,
    FilesModule.register(config.files)
  ],
  exports: [DataPlaneTestModule, AuthModule],
  controllers: []
})
export class AppModule {}
