import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ABAC_METADATA_KEY } from "@tsg-dsp/common-api";
import { Action, Resource } from "@tsg-dsp/common-dtos";
import type { Request } from "express";

import { AuthGuard } from "./auth.guard.js";

function createJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function createContext(request: Partial<Request>, handler: () => void) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({})
    }),
    getHandler: () => handler,
    getClass: () => AuthGuard
  } as const;
}

describe("AuthGuard", () => {
  it("should authenticate bearer tokens via TokenService", async () => {
    const reflector = new Reflector();
    const tokenService = {
      validateToken: vi.fn().mockResolvedValue({})
    } as any;
    const guard = new AuthGuard(reflector, tokenService);

    const handler = () => undefined;
    Reflect.defineMetadata(
      ABAC_METADATA_KEY,
      [{ action: Action.READ, resource: Resource.SSO_USER }],
      handler
    );

    const token = createJwt({
      sub: "user-1",
      azp: "client-1",
      permissions: ["read:sso.user"]
    });
    const request = {
      headers: { authorization: `Bearer ${token}` }
    } as Partial<Request> & { user?: unknown };

    await expect(
      guard.canActivate(createContext(request, handler) as any)
    ).resolves.toBe(true);

    expect(tokenService.validateToken).toHaveBeenCalledWith(
      token,
      "access_token"
    );
    expect(request.user).toEqual({
      sub: "user-1",
      permissions: ["read:sso.user"]
    });
  });

  it("should reject bearer tokens that fail TokenService validation", async () => {
    const guard = new AuthGuard(new Reflector(), {
      validateToken: vi.fn().mockRejectedValue(new Error("revoked"))
    } as any);

    const token = createJwt({ sub: "user-1", permissions: [] });
    const request = {
      headers: { authorization: `Bearer ${token}` }
    } as Partial<Request>;

    await expect(
      guard.canActivate(createContext(request, () => undefined) as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
