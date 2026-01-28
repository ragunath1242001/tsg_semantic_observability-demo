import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServerConfig, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { AppError } from "@tsg-dsp/common-api";
import { VerifiablePresentationJwt } from "@tsg-dsp/common-dsp";
import { DcqlQuery, OID4VPAuthorizationResponse } from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { CredentialDao, KeyMaterialDao } from "../../model/credentials.dao.js";
import { StatusListCredentialDao } from "../../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { AuthorizationRequestDao } from "../../model/presentation.dao.js";
import { ScopeDao } from "../../model/scopes.dao.js";
import { PresentationService } from "../presentation.service.js";
import { OID4VPVerifierService } from "./verifier.service.js";

describe("OID4VPVerifierService", () => {
  let service: OID4VPVerifierService;
  let presentationService: PresentationService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true
        },
        {
          id: "key-1",
          type: "EdDSA",
          default: false
        }
      ],
      initCredentials: [
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential`,
          keyId: "key-1",
          credentialSubject: {
            id: "did:web:localhost"
          }
        }
      ]
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          AuthorizationRequestDao,
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs,
          ScopeDao
        ]),
        TypeOrmModule.forFeature([
          AuthorizationRequestDao,
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs,
          ScopeDao
        ])
      ],
      providers: [
        OID4VPVerifierService,
        PresentationService,
        CredentialsService,
        SignatureService,
        KeysService,
        DidService,
        {
          provide: ServerConfig,
          useValue: {
            publicAddress: "http://localhost"
          }
        },
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    service = moduleRef.get<OID4VPVerifierService>(OID4VPVerifierService);
    presentationService =
      moduleRef.get<PresentationService>(PresentationService);
    const credentialService = moduleRef.get(CredentialsService);
    const didService = moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        return HttpResponse.json(await didService.getDid());
      }),
      http.get("http://localhost:3000/credentials/status-0", async () => {
        const credentialDao = await credentialService.getCredential(
          "http://localhost:3000/credentials/status-0"
        );
        return HttpResponse.json(credentialDao.credential);
      })
    );
    server.listen({ onUnhandledRequest: "warn" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("createAuthorizationRequest", () => {
    it("should create an authorization request and return the request URI", async () => {
      const dcqlQuery: DcqlQuery = {
        credentials: [
          {
            id: "test-definition",
            format: "jwt_vc_json",
            meta: {}
          }
        ]
      };

      const result = await service.createAuthorizationRequest(dcqlQuery);

      expect(result).toContain(
        "oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/"
      );
    });
  });

  describe("getAuthorizationRequest", () => {
    it("should return the authorization request if found", async () => {
      const id = "test-id";
      const authorizationRequest = {
        identifier: id,
        nonce: "test-nonce",
        dcqlQuery: {
          credentials: [
            {
              id: "test-definition",
              format: "jwt_vc_json",
              meta: {}
            }
          ]
        }
      };
      await service.authorizationRequestRepository.save(authorizationRequest);

      const result = await service.getAuthorizationRequest(id);

      expect(result).toEqual(
        expect.objectContaining({
          state: id,
          nonce: "test-nonce",
          client_id: "http://localhost",
          response_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "direct_post"
        })
      );
    });

    it("should throw an error if the authorization request is not found", async () => {
      const id = "test-id222";

      await expect(service.getAuthorizationRequest(id)).rejects.toThrow(
        AppError
      );
    });
  });

  describe("verify", () => {
    let vpJwt: VerifiablePresentationJwt;
    beforeAll(async () => {
      vpJwt = await presentationService.createVerifiablePresentationJwt(
        "did:web:localhost#test-init-credential",
        "http://localhost", // Set audience to match verifier
        false
      );
    });
    it("should verify the authorization response and return a success message", async () => {
      const authorizationResponse: OID4VPAuthorizationResponse = {
        state: "test-state",
        vp_token: { testDefinition: [vpJwt.vp] }
      };
      const authorizationRequest = {
        identifier: "test-state",
        nonce: "test-nonce",
        dcqlQuery: {
          credentials: [
            {
              id: "testDefinition",
              format: "jwt_vc_json",
              meta: {}
            }
          ]
        }
      };
      await service.authorizationRequestRepository.save(authorizationRequest);
      const result = await service.verify(authorizationResponse);

      expect(result).toBe(
        "Your Verifiable Presentation has been validated, you may now proceed."
      );
    });

    it("should throw an error if the authorization request is not found", async () => {
      const authorizationResponse: OID4VPAuthorizationResponse = {
        state: "test-state12341234",
        vp_token: { testDefinition: [vpJwt.vp] }
      };

      await expect(service.verify(authorizationResponse)).rejects.toThrow(
        AppError
      );
    });

    it("should throw an error if the vp_token is invalid", async () => {
      const authorizationResponse: OID4VPAuthorizationResponse = {
        state: "test-state",
        vp_token: { invalidDefinition: [vpJwt.vp] }
      };
      const authorizationRequest = {
        identifier: "test-state",
        nonce: "test-nonce",
        dcqlQuery: {
          credentials: [
            {
              id: "testDefinition",
              format: "jwt_vc_json",
              meta: {}
            }
          ]
        }
      };
      await service.authorizationRequestRepository.save(authorizationRequest);

      await expect(service.verify(authorizationResponse)).rejects.toThrow(
        AppError
      );
    });
  });
});
