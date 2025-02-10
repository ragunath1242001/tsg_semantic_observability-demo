import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper, ServerConfig } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";
import { OauthUser } from "../model/user.dao.js";
import { UsersService } from "../users/users.service.js";
import { AuthService } from "./auth.service.js";
import { Request } from "express";

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: UsersService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(ServerConfig, {});
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthUser]),
        TypeOrmModule.forFeature([OauthUser])
      ],
      providers: [
        AuthService,
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
    usersService = module.get<UsersService>(UsersService);

    await usersService.createUser({
      username: "Alice",
      password: "password",
      email: "alice@example.com",
      roles: ["user"],
      grants: ["authorization_code"]
    });
    await usersService.createUser({
      username: "Bob",
      password: "password",
      email: "bob@example.com",
      roles: ["user"],
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
        roles: user.roles,
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
