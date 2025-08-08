import { beforeAll, describe, expect, it } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";

import { RootConfig } from "../config.js";
import { IssueConfiguration } from "../model/issue-configuration.dao.js";
import { IssueConfigurationService } from "./issue-configuration.service.js";

describe("Issue Configuration Service", () => {
  let issueConfigurationService: IssueConfigurationService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      issueConfigurations: [
        {
          id: "InitTest",
          credentialType: "InitTestCredential",
          documentUrl: "http://localhost:3000/issue-configuration/Test",
          schema: {
            type: "object",
            title: "TestCredential",
            additionalProperties: true,
            properties: {
              id: {
                type: "string",
                pattern: "^did:web:.*"
              },
              testIdentifier: {
                type: "string",
                pattern: "^urn:test:.*"
              },
              testRole: {
                enum: [
                  "test:ServiceProvider",
                  "test:Manufacturer",
                  "test:Administrator"
                ]
              }
            },
            required: ["id", "testIdentifier", "testRole"]
          }
        }
      ]
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([IssueConfiguration]),
        TypeOrmModule.forFeature([IssueConfiguration])
      ],
      providers: [
        IssueConfigurationService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    issueConfigurationService = await moduleRef.get(IssueConfigurationService);
    await issueConfigurationService.initialized;
    await issueConfigurationService.init();
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Issue Configuration Management", () => {
    it("Insert issue configuration", async () => {
      const issueConfig =
        await issueConfigurationService.insertIssueConfiguration({
          id: "Test",
          credentialType: "TestCredential",
          proofType: "jwt",
          documentUrl: "http://localhost:3000/issue-configuration/Test",
          schema: {
            type: "object",
            title: "TestCredential",
            additionalProperties: true,
            properties: {
              id: {
                type: "string",
                pattern: "^did:web:.*"
              },
              testIdentifier: {
                type: "string",
                pattern: "^urn:test:.*"
              },
              testRole: {
                enum: [
                  "test:ServiceProvider",
                  "test:Manufacturer",
                  "test:Administrator"
                ]
              }
            },
            required: ["id", "testIdentifier", "testRole"]
          }
        });
      expect(issueConfig.id).toBe("Test");
      expect(issueConfig.credentialType).toBe("TestCredential");
      expect(issueConfig.documentUrl).toBe(
        "http://localhost:3000/issue-configuration/Test"
      );
      expect(issueConfig.document).toBeNull();
      expect(issueConfig.schema).toBeDefined();
    });
    it("Insert already existing issue configuration", async () => {
      await expect(
        issueConfigurationService.insertIssueConfiguration({
          id: "Test",
          credentialType: "TestCredential",
          proofType: "jwt",
          documentUrl: "http://localhost:3000/issue-configuration/Test",
          schema: {}
        })
      ).rejects.toThrow("already exists");
    });
    it("Get issue configurations", async () => {
      const issueConfigs =
        await issueConfigurationService.getIssueConfigurations();
      expect(issueConfigs).toHaveLength(2);
    });
    it("Get issue configuration", async () => {
      const issueConfig =
        await issueConfigurationService.getIssueConfiguration("Test");
      expect(issueConfig.id).toBe("Test");
      expect(issueConfig.credentialType).toBe("TestCredential");
      expect(issueConfig.documentUrl).toBe(
        "http://localhost:3000/issue-configuration/Test"
      );
      expect(issueConfig.document).toBeNull();
      expect(issueConfig.schema).toBeDefined();
    });
    it("Update issue configuration", async () => {
      const issueConfig =
        await issueConfigurationService.updateIssueConfiguration("Test", {
          id: "Test",
          credentialType: "TestCredentialUpdated",
          proofType: "jwt",
          documentUrl: "http://localhost:3000/issue-configuration/Test",
          schema: {
            type: "object",
            title: "TestCredential",
            additionalProperties: true,
            properties: {
              id: {
                type: "string",
                pattern: "^did:web:.*"
              },
              testIdentifier: {
                type: "string",
                pattern: "^urn:test:.*"
              },
              testRole: {
                enum: [
                  "test:ServiceProvider",
                  "test:Manufacturer",
                  "test:Administrator"
                ]
              }
            },
            required: ["id", "testIdentifier", "testRole"]
          }
        });
      expect(issueConfig.id).toBe("Test");
      expect(issueConfig.credentialType).toBe("TestCredentialUpdated");
      expect(issueConfig.documentUrl).toBe(
        "http://localhost:3000/issue-configuration/Test"
      );
      expect(issueConfig.document).toBeNull();
      expect(issueConfig.schema).toBeDefined();
    });
    it("Delete issue configuration", async () => {
      await issueConfigurationService.deleteIssueConfiguration("Test");
    });
    it("Get non-existing issue configuration", async () => {
      await expect(
        issueConfigurationService.getIssueConfiguration("Test")
      ).rejects.toThrow("not found");
    });
    it("Update non-existing issue configuration", async () => {
      await expect(
        issueConfigurationService.updateIssueConfiguration("Test", {
          id: "Test",
          credentialType: "TestCredential",
          proofType: "jwt",
          documentUrl: "http://localhost:3000/issue-configuration/Test",
          schema: {}
        })
      ).rejects.toThrow("does not exists");
    });
  });
});
