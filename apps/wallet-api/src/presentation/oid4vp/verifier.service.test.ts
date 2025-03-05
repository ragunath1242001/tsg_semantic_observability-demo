import { Test, TestingModule } from "@nestjs/testing";
import { PresentationService } from "../presentation.service.js";
import { describe, expect, beforeAll, afterAll, it } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { ServerConfig, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { AuthorizationRequestDao } from "../../model/presentation.dao.js";
import { CredentialDao, KeyMaterialDao } from "../../model/credentials.dao.js";
import { StatusListCredentialDao } from "../../model/credentials.dao.js";
import { DIDDocuments, DIDService, DIDLogs } from "../../model/did.dao.js";
import { OID4VPVerifierService } from "./verifier.service.js";
import {
  PresentationDefinition,
  AuthorizationResponse
} from "@tsg-dsp/common-dtos";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { DidService } from "../../did/did.service.js";
import { VerifiablePresentationJwt } from "@tsg-dsp/common-dsp";
import { SetupServer, setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

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
          DIDLogs
        ]),
        TypeOrmModule.forFeature([
          AuthorizationRequestDao,
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs
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
    const credentialService = await moduleRef.get(CredentialsService);
    const didService = await moduleRef.get(DidService);
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
      const presentationDefinition: PresentationDefinition = {
        id: "test-definition",
        input_descriptors: []
      };

      const result = await service.createAuthorizationRequest(
        presentationDefinition
      );

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
        presentationDefinition: { id: "test-definition", input_descriptors: [] }
      };
      await service.authorizationRequestRepository.save(authorizationRequest);

      const result = await service.getAuthorizationRequest(id);

      expect(result).toEqual(
        expect.objectContaining({
          state: id,
          nonce: "test-nonce",
          presentation_definition: {
            id: "test-definition",
            input_descriptors: []
          },
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
        "did:web:external.com",
        false
      );
    });
    it("should verify the authorization response and return a success message", async () => {
      const authorizationResponse: AuthorizationResponse = {
        state: "test-state",
        vp_token: vpJwt.vp,
        presentation_submission: {
          id: "test-submission",
          definition_id: "",
          descriptor_map: []
        }
      };
      const authorizationRequest = {
        identifier: "test-state",
        nonce: "test-nonce",
        presentationDefinition: { id: "test-definition", input_descriptors: [] }
      };
      await service.authorizationRequestRepository.save(authorizationRequest);
      const result = await service.verify(authorizationResponse);

      expect(result).toBe(
        "Your Verifiable Presentation has been validated, you may now proceed."
      );
    });

    it("should throw an error if the authorization request is not found", async () => {
      const authorizationResponse: AuthorizationResponse = {
        state: "test-state12341234",
        vp_token: vpJwt.vp,
        presentation_submission: {
          id: "test-submission",
          definition_id: "",
          descriptor_map: []
        }
      };

      await expect(service.verify(authorizationResponse)).rejects.toThrow(
        AppError
      );
    });
  });
});
