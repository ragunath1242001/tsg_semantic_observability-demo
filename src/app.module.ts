import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DataPlaneModule } from "./data-plane/dataplane.module";
import { ScheduleModule } from "@nestjs/schedule";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config.module";
import { HealthController } from "./health.controller";
import { DspClientModule } from "./dsp/client/client.module";
import { CatalogModule } from "./dsp/catalog/catalog.module";
import { NegotiationModule } from "./dsp/negotiation/negotiation.module";
import { TransferModule } from "./dsp/transfer/transfer.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule,
    ConfigModule
  ],
  exports: [
    AuthModule,
    DataPlaneModule,
    DspClientModule,
    CatalogModule,
    NegotiationModule,
    TransferModule
  ],
  controllers: [
    HealthController
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}