import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RequestContextMiddleware, LoggerMiddleware } from "./utils/logging.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ConfigModule, rootConfig } from "./config.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { WalletModule } from "./wallet/wallet.module.js";
import { ManagementModule } from "./management/management.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    TypeOrmModule.forRoot({
      ...rootConfig.db,
      entities: [dirname(fileURLToPath(import.meta.url)) + "/**/*.dao.ts"],
      synchronize: true
    }),
    WalletModule,
    ManagementModule,
    AuthModule,
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