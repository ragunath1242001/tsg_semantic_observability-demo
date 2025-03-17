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
import { ContextService } from "../contexts/context.service.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { SignatureService } from "../keys/signature.service.js";
import { JSONLDContext } from "../model/context.dao.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { SIToken } from "../model/dcp.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
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
      contexts: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          issuable: true,
          documentUrl: "https://example.com/context.json"
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
          JSONLDContext,
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
          JSONLDContext,
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
        ContextService,
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
    issuanceService = await moduleRef.get(IssuanceService);
    const didService = await moduleRef.get(DidService);
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
        offer.grants?.[OfferGrants.PRE_AUTHORIZATION_CODE]?.[
          "pre-authorization_code"
        ]
      ).toBeDefined();
    });
    it("Offer status", async () => {
      const status = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(status.total).toBe(2);
      expect(status.data[1].holderId).toBe("did:web:localhost");
      expect(status.data[1].credentialType).toBe("ExampleCredentialType");
      expect(status.data[1].revoked).toBe(false);

      const offer = await issuanceService.credentialOfferById(
        status.data[1].id
      );
      expect(offer.holderId).toBe("did:web:localhost");
      expect(offer.credentialType).toBe("ExampleCredentialType");
      expect(offer.revoked).toBe(false);

      await expect(issuanceService.credentialOfferById(-1)).rejects.toThrow(
        "No credential issuance flow found for id"
      );
    });
    it("Revoke offer", async () => {
      const status = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      await issuanceService.revokeOffer(status.data[1].id);
      const revokedStatus = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(revokedStatus.data[1].revoked).toBe(true);
      await expect(issuanceService.revokeOffer(-1)).rejects.toThrow(
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
