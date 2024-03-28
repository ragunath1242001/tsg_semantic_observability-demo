import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, config } from "./config.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ServeStaticModule } from "@nestjs/serve-static";
import { HealthController } from "./health.controller.js";
import { CredentialsModule } from "./credentials/credentials.module.js";
import { DidModule } from "./did/did.module.js";
import { IssuanceModule } from "./issuance/issuance.module.js";
import { KeysModule } from "./keys/keys.module.js";
import { PresentationModule } from "./presentation/presentation.module.js";

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
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      synchronize: true,
    }),
    PresentationModule.register(config.presentation),
    AuthModule,
    CredentialsModule,
    DidModule,
    KeysModule,
    IssuanceModule,
    ...embeddedFrontend,
  ],
  controllers: [HealthController],
  exports: [
    AuthModule,
    CredentialsModule,
    DidModule,
    IssuanceModule,
    KeysModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
