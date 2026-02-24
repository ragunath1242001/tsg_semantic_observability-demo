import { Global, Module } from "@nestjs/common";
import { SESSION_MIDDLEWARE } from "@tsg-dsp/common-api";
import crypto from "crypto";
import session from "express-session";

/**
 * Provides the Express session middleware as a shared singleton.
 *
 * Marked `@Global()` so the same instance is available to both the
 * Express pipeline (via `app.get(SESSION_MIDDLEWARE)`) and any
 * WebSocket gateway that uses {@link WsAuthMiddleware}.
 */
@Global()
@Module({
  providers: [
    {
      provide: SESSION_MIDDLEWARE,
      useFactory: () =>
        session({
          name: process.env["SESSION_NAME"] || "connect.sid.tsgadp",
          secret: process.env["SESSION_SECRET"] || crypto.randomUUID(),
          resave: false,
          saveUninitialized: false
        })
    }
  ],
  exports: [SESSION_MIDDLEWARE]
})
export class SessionModule {}
