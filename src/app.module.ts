import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypedConfigModule, fileLoader, dotenvLoader } from "nest-typed-config";
import { RootConfig } from "./config.js";
import { CredentialsModule } from "./controllers/credentials.module.js";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ConfigModule, rootConfig } from "./config.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CredentialsModule,
    ConfigModule,
    TypeOrmModule.forRoot({
      ...rootConfig.db,
      entities: [dirname(fileURLToPath(import.meta.url)) + "/**/*.dao.ts"],
      synchronize: true
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