import { describe, expect, beforeAll, it } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { ContextService } from "./context.service.js";
import { RootConfig } from "../config.js";
import { JSONLDContext } from "../model/context.dao.js";
import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";

describe("Context Service", () => {
  let contextService: ContextService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      contexts: [
        {
          id: "InitTest",
          credentialType: "InitTestCredential",
          issuable: true,
          documentUrl: "http://localhost:3000/context/Test",
          schema: {
            type: "object",
            title: "TestCredential",
            additionalProperties: true,
            properties: {
              id: {
                type: "string",
                pattern: "^did:web:.*",
              },
              testIdentifier: {
                type: "string",
                pattern: "^urn:test:.*",
              },
              testRole: {
                enum: [
                  "test:ServiceProvider",
                  "test:Manufacturer",
                  "test:Administrator",
                ],
              },
            },
            required: ["id", "testIdentifier", "testRole"],
          },
        },
      ],
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([JSONLDContext]),
        TypeOrmModule.forFeature([JSONLDContext]),
      ],
      providers: [
        ContextService,
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();

    contextService = await moduleRef.get(ContextService);
    await contextService.initialized;
    await contextService.init();
  });

  describe("Context Management", () => {
    it("Insert context", async () => {
      const context = await contextService.insertContext({
        id: "Test",
        credentialType: "TestCredential",
        issuable: true,
        documentUrl: "http://localhost:3000/context/Test",
        schema: {
          type: "object",
          title: "TestCredential",
          additionalProperties: true,
          properties: {
            id: {
              type: "string",
              pattern: "^did:web:.*",
            },
            testIdentifier: {
              type: "string",
              pattern: "^urn:test:.*",
            },
            testRole: {
              enum: [
                "test:ServiceProvider",
                "test:Manufacturer",
                "test:Administrator",
              ],
            },
          },
          required: ["id", "testIdentifier", "testRole"],
        },
      });
      expect(context.id).toBe("Test");
      expect(context.credentialType).toBe("TestCredential");
      expect(context.issuable).toBe(true);
      expect(context.documentUrl).toBe("http://localhost:3000/context/Test");
      expect(context.document).toBeNull();
      expect(context.schema).toBeDefined();
    });
    it("Insert already existing context", async () => {
      await expect(
        contextService.insertContext({
          id: "Test",
          credentialType: "TestCredential",
          issuable: true,
          documentUrl: "http://localhost:3000/context/Test",
          schema: {},
        })
      ).rejects.toThrow("already exists");
    });
    it("Get contexts", async () => {
      const contexts = await contextService.getContexts();
      expect(contexts).toHaveLength(2);
    });
    it("Get context", async () => {
      const context = await contextService.getContext("Test");
      expect(context.id).toBe("Test");
      expect(context.credentialType).toBe("TestCredential");
      expect(context.issuable).toBe(true);
      expect(context.documentUrl).toBe("http://localhost:3000/context/Test");
      expect(context.document).toBeNull();
      expect(context.schema).toBeDefined();
    });
    it("Update context", async () => {
      const context = await contextService.updateContext("Test", {
        id: "Test",
        credentialType: "TestCredentialUpdated",
        issuable: true,
        documentUrl: "http://localhost:3000/context/Test",
        schema: {
          type: "object",
          title: "TestCredential",
          additionalProperties: true,
          properties: {
            id: {
              type: "string",
              pattern: "^did:web:.*",
            },
            testIdentifier: {
              type: "string",
              pattern: "^urn:test:.*",
            },
            testRole: {
              enum: [
                "test:ServiceProvider",
                "test:Manufacturer",
                "test:Administrator",
              ],
            },
          },
          required: ["id", "testIdentifier", "testRole"],
        },
      });
      expect(context.id).toBe("Test");
      expect(context.credentialType).toBe("TestCredentialUpdated");
      expect(context.issuable).toBe(true);
      expect(context.documentUrl).toBe("http://localhost:3000/context/Test");
      expect(context.document).toBeNull();
      expect(context.schema).toBeDefined();
    });
    it("Delete context", async () => {
      await contextService.deleteContext("Test");
    });
    it("Get non-existing context", async () => {
      await expect(contextService.getContext("Test")).rejects.toThrow(
        "not found"
      );
    });
    it("Update non-existing context", async () => {
      await expect(
        contextService.updateContext("Test", {
          id: "Test",
          credentialType: "TestCredential",
          issuable: true,
          documentUrl: "http://localhost:3000/context/Test",
          schema: {},
        })
      ).rejects.toThrow("does not exists");
    });
  });
});
