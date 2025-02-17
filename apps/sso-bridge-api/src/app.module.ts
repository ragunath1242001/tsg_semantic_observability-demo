import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  GenericConfigModule,
  HealthController,
  LoggerMiddleware,
  RequestContextMiddleware
} from "@tsg-dsp/common-api";
import { RootConfig } from "./config.js";
import { TerminusModule } from "@nestjs/terminus";
import { OauthModule } from "./oauth/oauth.module.js";
import { UsersModule } from "./users/users.module.js";
import { ClientsModule } from "./clients/clients.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { KubernetesModule } from "./k8s/kubernetes.module.js";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        serveRoot: process.env["SUBPATH"],
        exclude: ["/api/(.*)", "/.well-known/(.*)"]
      })
    ]
  : [];

@Module({
  imports: [
    TerminusModule,
    GenericConfigModule.register(RootConfig),
    TypeOrmModule.forRoot({
      ...GenericConfigModule.get(RootConfig).db,
      autoLoadEntities: true,
      migrations: [
        `dist/migrations/*-${GenericConfigModule.get(RootConfig).db.type}{.ts,.js}`
      ],
      migrationsRun: !GenericConfigModule.get(RootConfig).db.synchronize
    }),
    AuthModule,
    OauthModule,
    KubernetesModule,
    UsersModule,
    ClientsModule,
    ...embeddedFrontend,
    UsersModule
  ],
  controllers: [HealthController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
