import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypedConfigModule, fileLoader, dotenvLoader } from "nest-typed-config";
import { RootConfig } from "./config";
import { CredentialsModule } from "./controllers/credentials.module";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CredentialsModule,
    TypedConfigModule.forRoot({
      schema: RootConfig,
      load: [
        fileLoader(),
        dotenvLoader({
          separator: "__",
          keyTransformer: (key) => key.toLowerCase().replace(/([a-z]_[a-z])/g, g => g[0] + g[2].toUpperCase()),
        }),
      ]
    })
  ],
  exports: [
    CredentialsModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}