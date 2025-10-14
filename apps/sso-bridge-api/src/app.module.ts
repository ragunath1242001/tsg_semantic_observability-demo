import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TerminusModule } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  GenericConfigModule,
  HealthController,
  LoggerMiddleware,
  RequestContextMiddleware
} from "@tsg-dsp/common-api";

import { AuthModule } from "./auth/auth.module.js";
import { ClientsModule } from "./clients/clients.module.js";
import { RootConfig } from "./config.js";
import { KubernetesModule } from "./k8s/kubernetes.module.js";
import { OauthModule } from "./oauth/oauth.module.js";
import { PresentationModule } from "./presentation/presentation.module.js";
import { RolesModule } from "./roles/roles.module.js";
import { UsersModule } from "./users/users.module.js";

const embeddedFrontend = process.env["EMBEDDED_FRONTEND"]
  ? [
      ServeStaticModule.forRoot({
        rootPath: process.env["EMBEDDED_FRONTEND"],
        serveRoot: process.env["SUBPATH"],
        exclude: ["/api/*paths", "/.well-known/*paths"]
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
    RolesModule,
    PresentationModule,
    ClientsModule,
    ...embeddedFrontend
  ],
  controllers: [HealthController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
