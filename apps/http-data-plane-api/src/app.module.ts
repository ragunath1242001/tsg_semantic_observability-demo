import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module";
import { ConfigModule, config } from "./config.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";
import { AuthModule } from "./auth/auth.module";
import { LoggingModule } from "./logging/logging.module";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        exclude: ["/api/(.*)"],
      }),
    ]
  : [];

@Module({
  imports: [
    DataPlaneTestModule,
    LoggingModule,
    AuthModule,
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      synchronize: true,
    }),
    ...embeddedFrontend,
  ],
  exports: [DataPlaneTestModule, AuthModule],
  controllers: [],
})
export class AppModule {}
