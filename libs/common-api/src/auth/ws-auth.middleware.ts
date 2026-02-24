import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type { RequestHandler } from "express";

import { AuthConfig } from "../config/auth.js";
import { OAuthService } from "./oauth.service.js";

/**
 * Injection token for the Express session middleware instance.
 *
 * Provide this token (e.g. via a `@Global()` SessionModule) so that
 * {@link WsAuthMiddleware} can parse session cookies on WebSocket
 * upgrade requests using the **same** session store as Express.
 */
export const SESSION_MIDDLEWARE = "SESSION_MIDDLEWARE";

/**
 * Reusable Socket.IO authentication middleware.
 *
 * Validates incoming WebSocket connections by trying, in order:
 * 1. **Session cookie** – runs the shared Express session middleware on
 *    the upgrade request so the existing session is loaded.
 * 2. **Bearer token** – from the `Authorization` header sent during the
 *    WebSocket handshake.
 * 3. **Auth payload token** – from Socket.IO's `auth.token` handshake
 *    field (useful for programmatic clients).
 *
 * If authentication is disabled (`auth.enabled = false`), all
 * connections are accepted.
 *
 * @example
 * ```ts
 * @WebSocketGateway()
 * export class MyGateway implements OnGatewayInit {
 *   constructor(private readonly wsAuth: WsAuthMiddleware) {}
 *
 *   afterInit(server: Server) {
 *     server.use(this.wsAuth.createMiddleware());
 *   }
 * }
 * ```
 */
@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);

  constructor(
    private readonly authConfig: AuthConfig,
    private readonly oAuthService: OAuthService,
    @Optional()
    @Inject(SESSION_MIDDLEWARE)
    private readonly sessionMiddleware?: RequestHandler
  ) {}

  /**
   * Returns a Socket.IO middleware function that rejects
   * unauthenticated connections before they are established.
   */
  createMiddleware(): (socket: any, next: (err?: Error) => void) => void {
    return async (socket: any, next: (err?: Error) => void) => {
      if (!this.authConfig.enabled) {
        return next();
      }

      // 1. Session cookie — parse by running the shared Express session
      //    middleware against the raw upgrade request.
      if (this.sessionMiddleware) {
        try {
          await this.parseSession(socket.request);
          if (socket.request.session?.user) {
            return next();
          }
        } catch (error) {
          this.logger.debug(
            `WS ${socket.id}: session parsing failed: ${String(error)}`
          );
        }
      }

      // 2. Bearer token from the Authorization header.
      const authHeader: string | undefined =
        socket.handshake?.headers?.["authorization"];
      if (authHeader?.startsWith("Bearer ")) {
        try {
          await this.oAuthService.validateToken(authHeader.substring(7));
          return next();
        } catch (error) {
          this.logger.debug(
            `WS ${socket.id}: Bearer validation failed: ${String(error)}`
          );
        }
      }

      // 3. Token from Socket.IO auth payload (e.g. `io({ auth: { token } })`).
      const authToken: string | undefined = socket.handshake?.auth?.token;
      if (authToken) {
        try {
          await this.oAuthService.validateToken(authToken);
          return next();
        } catch (error) {
          this.logger.debug(
            `WS ${socket.id}: auth payload validation failed: ${String(error)}`
          );
        }
      }

      this.logger.debug(
        `WS ${socket.id}: no valid credentials — rejecting connection`
      );
      return next(new Error("Unauthorized"));
    };
  }

  /**
   * Runs the Express session middleware on the raw HTTP upgrade request
   * so that `request.session` is populated from the cookie.
   */
  private parseSession(request: unknown): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // The second argument (response) is not used for session parsing;
      // a stub object is sufficient as express-session only writes
      // Set-Cookie headers on it which is a no-op here.
      this.sessionMiddleware!(request as any, {} as any, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
