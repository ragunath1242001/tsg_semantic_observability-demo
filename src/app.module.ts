import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { DspModule } from "./controllers/dsp/dsp.module";
import { DataPlaneModule } from "./controllers/data-plane/dataplane.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ManagementModule } from "./controllers/management/management.module";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging";
import { AuthModule } from "./auth/auth.module";
import { TypedConfigModule, fileLoader, dotenvLoader } from 'nest-typed-config';
import { RootConfig } from "./config";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DspModule,
    DataPlaneModule,
    ManagementModule,
    AuthModule,
    TypedConfigModule.forRoot({
      schema: RootConfig,
      load: [
        fileLoader(),
        dotenvLoader({
          separator: "__",
          keyTransformer: (key) => key.toLowerCase().replace(/([a-z]_[a-z])/g, g => g[0] + g[2].toUpperCase()),
        }),
      ],
    }),
  ],
  exports: [
    DspModule,
    DataPlaneModule,
    ManagementModule,
    AuthModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}