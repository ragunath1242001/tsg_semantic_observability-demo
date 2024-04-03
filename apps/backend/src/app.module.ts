import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module";
import { ConfigModule, config } from "./config.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServeStaticModule } from "@nestjs/serve-static";

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
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      synchronize: true,
    }),
    ...embeddedFrontend,
  ],
  exports: [DataPlaneTestModule],
  controllers: [],
})
export class AppModule {}
