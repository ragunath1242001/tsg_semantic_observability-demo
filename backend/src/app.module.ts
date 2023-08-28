import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, config } from "./config.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { WalletModule } from "./wallet/wallet.module.js";
import { ManagementModule } from "./management/management.module.js";
import { ServeStaticModule } from "@nestjs/serve-static";


const embeddedFrontend = (process.env['EMBEDDED_FRONTEND']) ? [
  ServeStaticModule.forRoot({
    rootPath: process.env['EMBEDDED_FRONTEND'],
    exclude: ['/api/(.*)', '/.well-known/(.*)'],
  })
 ] : []

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      entities: ["**/*.dao{.js,.ts}"],
      synchronize: true
    }),
    WalletModule,
    ManagementModule,
    AuthModule,
    ...embeddedFrontend
  ],
  exports: [
    WalletModule,
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