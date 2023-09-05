import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DspModule } from "./controllers/dsp/dsp.module";
import { DataPlaneModule } from "./controllers/data-plane/dataplane.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ManagementModule } from "./controllers/management/management.module";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DspModule,
    DataPlaneModule,
    ManagementModule,
    AuthModule,
    ConfigModule,
  ],
  exports: [
    DspModule,
    DataPlaneModule,
    ManagementModule,
    AuthModule
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