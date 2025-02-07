import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OauthUser } from "../model/user.dao.js";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";
import { plainToInstance } from "class-transformer";

describe("UsersService Tests", () => {
  let service: UsersService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    let module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthUser]),
        TypeOrmModule.forFeature([OauthUser])
      ],
      providers: [
        UsersService,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("UsersService", () => {
    it("should create a new user", async () => {
      const userData: Partial<OauthUser> = {
        username: "Alice",
        password: "password",
        email: "alice@example.com",
        roles: ["user"],
        grants: ["authorization_code"]
      };
      const user = await service.createUser(userData);
      expect(user).toHaveProperty("id");
      expect(user.username).toEqual("Alice");
    });

    it("should retrieve users", async () => {
      await service.createUser({
        username: "Bob",
        password: "password",
        email: "bob@example.com",
        roles: ["user"],
        grants: ["authorization_code"]
      });
      const users = await service.getUsers();
      expect(users.length).toBeGreaterThanOrEqual(1);
    });

    it("should update an existing user", async () => {
      const user = await service.createUser({
        username: "Charlie",
        password: "password",
        email: "charlie@example.com",
        roles: ["user"],
        grants: ["authorization_code"]
      });
      const updated = await service.updateUser(user.id, {
        username: "Charles"
      });
      expect(updated.username).toEqual("Charles");
    });

    it("should throw error when updating non-existent user", async () => {
      await expect(
        service.updateUser(9999, { username: "DoesNotExist" } as any)
      ).rejects.toThrowError();
    });

    it("should delete an existing user", async () => {
      const user = await service.createUser({
        username: "Delta",
        password: "password",
        email: "delta@example.com",
        roles: ["user"],
        grants: ["authorization_code"]
      });
      const result = await service.deleteUser(user.id);
      expect(result.deleted).toEqual(true);
    });

    it("should throw error when deleting non-existent user", async () => {
      await expect(service.deleteUser(9999)).rejects.toThrow("not found");
    });
  });
});
