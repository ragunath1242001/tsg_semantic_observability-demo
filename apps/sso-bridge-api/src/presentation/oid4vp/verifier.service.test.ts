import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { PresentationService } from "../presentation.service.js";
import { describe, expect, beforeAll, afterAll, it } from "@jest/globals";
import {
  AuthorizationRequest,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { OID4VPVerifierService } from "./verifier.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { SetupServer, setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { AuthorizationRequestDao } from "../../model/oid4vp.dao.js";
import { UsersService } from "../../users/users.service.js";
import { RootConfig } from "../../config.js";
import { OauthUser } from "../../model/user.dao.js";
import { plainToInstance } from "class-transformer";
import { OauthService } from "../../oauth/oauth.service.js";
import { ClientsService } from "../../clients/clients.service.js";
import { TokenService } from "../../oauth/token.service.js";
import { KubernetesService } from "../../k8s/kubernetes.service.js";
import { OauthClient } from "../../model/client.dao.js";
import { KeyDao } from "../../model/keys.dao.js";
import { TokenDao } from "../../model/token.dao.js";

describe("OID4VPVerifierService", () => {
  let service: OID4VPVerifierService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          AuthorizationRequestDao,
          OauthUser,
          OauthClient,
          TokenDao,
          KeyDao
        ]),
        TypeOrmModule.forFeature([
          AuthorizationRequestDao,
          OauthUser,
          OauthClient,
          TokenDao,
          KeyDao
        ])
      ],
      providers: [
        OID4VPVerifierService,
        PresentationService,
        OauthService,
        ClientsService,
        TokenService,
        UsersService,
        {
          provide: KubernetesService,
          useValue: {
            applySecret: jest.fn()
          }
        },
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {
            server: {
              publicAddress: "http://localhost"
            }
          })
        },
        {
          provide: ServerConfig,
          useValue: plainToInstance(ServerConfig, {
            publicAddress: "http://localhost"
          })
        }
      ]
    }).compile();

    service = moduleRef.get<OID4VPVerifierService>(OID4VPVerifierService);
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        return HttpResponse.json();
      }),
      http.get("http://localhost:3000/credentials/status-0", async () => {
        return HttpResponse.json();
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
      const result = await service.createAuthorizationRequest(
        "test-definition",
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest
      );

      expect(result).toContain(
        "oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/test-definition"
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
});
