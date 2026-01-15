import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServerConfig, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { Request } from "express";

import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { OauthRole } from "../model/role.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { RolesService } from "../roles/roles.service.js";
import { UsersService } from "../users/users.service.js";
import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  let authService: AuthService;
  let rolesService: RolesService;
  let usersService: UsersService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(ServerConfig, {});
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthUser, OauthRole, OauthClient]),
        TypeOrmModule.forFeature([OauthUser, OauthRole, OauthClient])
      ],
      providers: [
        AuthService,
        RolesService,
        UsersService,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        },
        {
          provide: ServerConfig,
          useValue: config
        }
      ]
    }).compile();

    authService = module.get<AuthService>(AuthService);
    rolesService = module.get<RolesService>(RolesService);
    usersService = module.get<UsersService>(UsersService);

    const userRole = await rolesService.createRole({
      name: "user",
      description: "User role"
    });
    await usersService.createUser({
      username: "Alice",
      password: "password",
      email: "alice@example.com",
      roles: [userRole.name],
      grants: ["authorization_code"]
    });
    await usersService.createUser({
      username: "Bob",
      password: "password",
      email: "bob@example.com",
      roles: [userRole.name],
      grants: ["authorization_code"]
    });
  });
  describe("Test Auth Service Session handling", () => {
    it("No session", async () => {
      const user = await usersService.getUser(1);
      const request: Request = {} as Request;

      const loginResult = await authService.login("Alice", "password", request);

      expect(loginResult).toEqual(user);
      expect(request.session).toBeUndefined();
      await authService.logout(request);
    });
    it("Empty session and logout", async () => {
      const user = await usersService.getUser(1);
      const request = {
        session: {}
      } as unknown as Request;
      const loginResult = await authService.login("Alice", "password", request);

      expect(loginResult).toEqual(user);
      expect(request.session).toBeDefined();
      expect((request.session as any).user).toEqual(user);

      await authService.logout(request);
      expect((request.session as any).user).toBeUndefined();
    });
    it("Session with user", async () => {
      const user = await usersService.getUser(1);
      const user2 = await usersService.getUser(2);
      const requestWithUserSession = {
        session: {
          user: user2
        }
      } as unknown as Request;

      const loginResult3 = await authService.login(
        "Alice",
        "password",
        requestWithUserSession
      );

      expect(loginResult3).toEqual(user);
      expect(requestWithUserSession.session).toBeDefined();
      expect((requestWithUserSession.session as any).user).toEqual(user);
    });
  });
  it("getUser", async () => {
    const user = await usersService.getUser(1);
    const request = {
      session: {
        user: user
      }
    } as unknown as Request;

    const result = await authService.getUser(request);

    expect(result).toEqual({
      state: "authenticated",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles.map((role) =>
          expect.objectContaining({
            id: role.id,
            name: role.name
          })
        ),
        grants: user.grants
      }
    });

    const request2 = {
      session: {}
    } as unknown as Request;
    const result2 = await authService.getUser(request2);
    expect(result2).toEqual({
      state: "unauthenticated"
    });
  });
});
