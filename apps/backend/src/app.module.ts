import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DataPlaneModule } from "./data-plane/dataplane.module";
import { ScheduleModule } from "@nestjs/schedule";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule, config } from "./config.module";
import { HealthController } from "./health.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DspClientModule } from "./dsp/client/client.module";
import { CatalogModule } from "./dsp/catalog/catalog.module";
import { NegotiationModule } from "./dsp/negotiation/negotiation.module";
import { TransferModule } from "./dsp/transfer/transfer.module";
import { RegistryModule } from "./registry/registry.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ConfigController } from "./config.controller";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        exclude: ["/api/(.*)", "/.well-known/(.*)"],
      }),
    ]
  : [];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      synchronize: true,
    }),
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule,
    ...embeddedFrontend,
    RegistryModule,
  ],
  exports: [
    AuthModule,
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule,
  ],
  controllers: [ConfigController, HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
