import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TerminusModule } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AbacModule,
  AuditLogModule,
  createAuditLogController,
  GenericConfigModule,
  HealthController,
  LoggerMiddleware,
  RequestContextMiddleware,
  toTypeOrmType
} from "@tsg-dsp/common-api";
import { Resource } from "@tsg-dsp/common-dtos";

import { AuthModule } from "./auth/auth.module.js";
import { SessionAbacMiddleware } from "./auth/session-abac.middleware.js";
import { ClientsModule } from "./clients/clients.module.js";
import { RootConfig } from "./config.js";
import { KubernetesModule } from "./k8s/kubernetes.module.js";
import { OauthModule } from "./oauth/oauth.module.js";
import { PermissionsModule } from "./permissions/permissions.module.js";
import { PresentationModule } from "./presentation/presentation.module.js";
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
    AbacModule.forRoot(),
    AuditLogModule,
    GenericConfigModule.register(RootConfig),
    TypeOrmModule.forRoot({
      ...GenericConfigModule.get(RootConfig).db,
      type: toTypeOrmType(GenericConfigModule.get(RootConfig).db.type),
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
    PermissionsModule,
    PresentationModule,
    ClientsModule,
    ...embeddedFrontend
  ],
  controllers: [
    createAuditLogController(Resource.SSO_AUDIT_LOG),
    HealthController
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
    consumer.apply(SessionAbacMiddleware).forRoutes("{*path}");
    consumer.apply(LoggerMiddleware).forRoutes("{*path}");
  }
}
