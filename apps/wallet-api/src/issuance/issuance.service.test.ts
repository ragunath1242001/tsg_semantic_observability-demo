import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EmailService,
  NodemailerConfiguration,
  PaginationOptionsDto,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { OfferGrants } from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../config.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import { IssueConfigurationService } from "../issue-configurations/issue-configuration.service.js";
import { KeysService } from "../keys/keys.service.js";
import { SignatureService } from "../keys/signature.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { SIToken } from "../model/dcp.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { IssueConfiguration } from "../model/issue-configuration.dao.js";
import { PresentationService } from "../presentation/presentation.service.js";
import { DCPHolderService } from "./dcp/holder.service.js";
import { IssuanceService } from "./issuance.service.js";
import { OID4VCIHolderService } from "./oid4vci/holder.service.js";

describe("DCP Issuance", () => {
  let issuanceService: IssuanceService;
  let server: SetupServer;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true
        }
      ],
      issueConfigurations: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          documentUrl: "https://example.com/context.json",
          schema: {
            required: ["email", "name"],
            properties: {
              email: {
                type: "string",
                title: "Email",
                default: "default@email.com"
              },
              name: {
                type: "string",
                title: "Name",
                default: "Default Name"
              }
            }
          }
        }
      ],
      issuance: {
        issuer: [
          {
            holderId: "did:web:localhost",
            credentialType: "ExampleCredentialType",
            credentialSubject: {
              id: "did:web:localhost",
              email: "noreply@dataspac.es"
            }
          }
        ]
      },
      runtime: {
        title: "Test"
      }
    });
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          CredentialIssuance,
          CIAccessToken,
          IssueConfiguration,
          DIDLogs,
          SIToken
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          CredentialIssuance,
          CIAccessToken,
          IssueConfiguration,
          DIDLogs,
          SIToken
        ])
      ],
      providers: [
        CredentialsService,
        DidService,
        EmailService,
        KeysService,
        SignatureService,
        PresentationService,
        IssuanceService,
        {
          provide: IssueConfigurationService,
          useValue: {
            getIssueConfiguration: jest.fn().mockImplementation(() => ({
              id: "Example",
              credentialType: "ExampleCredentialType",
              documentUrl: "https://example.com/context.json",
              schema: {
                required: ["email", "name"],
                properties: {
                  email: {
                    type: "string",
                    title: "Email",
                    default: "user@email.com"
                  },
                  name: {
                    type: "string",
                    title: "Name",
                    default: "Default Name"
                  }
                }
              }
            }))
          }
        },
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: NodemailerConfiguration,
          useValue: plainToInstance(NodemailerConfiguration, {
            enabled: false
          })
        },
        {
          provide: OID4VCIHolderService,
          useValue: {
            requestCredential: jest.fn()
          }
        },
        {
          provide: DCPHolderService,
          useValue: {
            requestCredential: jest.fn()
          }
        }
      ]
    }).compile();
    issuanceService = moduleRef.get(IssuanceService);
    const didService = moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    await issuanceService.initialized;
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        return HttpResponse.json(await didService.getDid());
      })
    );
    server.listen({ onUnhandledRequest: "bypass" });
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Issuance Offers", () => {
    it("Init", async () => {
      const status = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(status.total).toBe(1);
      await issuanceService.init();

      const status2 = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(status2.total).toBe(1);
    });
    it("addDefaultClaims adds missing required claims with defaults", async () => {
      const subject = { id: "did:web:test", email: "user@email.com" };
      await issuanceService.initialized;
      const result = await issuanceService.addDefaultClaims(
        subject,
        "ExampleCredentialType"
      );
      expect(result.email).toBe("user@email.com");
      expect(result.name).toBe("Default Name");
    });

    it("createCredentialOffer uses addDefaultClaims when mobile is true", async () => {
      const offer = await issuanceService.createCredentialOffer(
        {
          holderId: "did:web:mobile",
          credentialType: "MobileType",
          credentialSubject: { id: "did:web:mobile", email: "user@email.com" }
        },
        true
      );
      expect(offer.credential_configuration_ids[0]).toBe("MobileType");
      // Check that default claim was added
      const status = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      const created = status.data.find((o) => o.holderId === "did:web:mobile");
      expect(created).toBeDefined();
      expect(created!.credentialSubject.name).toBe("Default Name");
      expect(created!.credentialSubject.email).toBe("user@email.com");
    });
    it("Create offer", async () => {
      const offer = await issuanceService.createCredentialOffer({
        holderId: "did:web:localhost",
        credentialType: "ExampleCredentialType",
        credentialSubject: {
          id: "did:web:localhost",
          email: "noreply@dataspac.es"
        }
      });
      expect(offer.credential_issuer).toBe("https://localhost");
      expect(offer.credential_configuration_ids[0]).toBe(
        "ExampleCredentialType"
      );
      expect(
        offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.["pre-authorized_code"]
      ).toBeDefined();
    });
    it("Offer status", async () => {
      const status = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(status.total).toBe(3);
      expect(status.data[2].holderId).toBe("did:web:localhost");
      expect(status.data[2].credentialType).toBe("ExampleCredentialType");
      expect(status.data[2].revoked).toBe(false);

      const offer = await issuanceService.credentialOfferById(
        status.data[2].id
      );
      expect(offer.holderId).toBe("did:web:localhost");
      expect(offer.credentialType).toBe("ExampleCredentialType");
      expect(offer.revoked).toBe(false);

      await expect(
        issuanceService.credentialOfferById("unknown")
      ).rejects.toThrow("No credential issuance flow found for id");
    });
    it("Revoke offer", async () => {
      const status = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      await issuanceService.revokeOffer(status.data[1].id);
      const revokedStatus = await issuanceService.credentialOfferById(
        status.data[1].id
      );
      expect(revokedStatus.revoked).toBe(true);
      await expect(issuanceService.revokeOffer("unknown")).rejects.toThrow(
        "No credential issuance flow found for id"
      );
    });
    it("Credential request forwarding", async () => {
      await issuanceService.requestDCPCredential({
        issuerId: "did:web:localhost",
        credentialType: ["ExampleCredentialType"],
        preAuthorizedCode: "pre-authorized_code"
      });
      await issuanceService.requestOID4VCICredential({
        issuerUrl: "https://localhost",
        preAuthorizedCode: "pre-authorized_code"
      });
    });
  });
});
