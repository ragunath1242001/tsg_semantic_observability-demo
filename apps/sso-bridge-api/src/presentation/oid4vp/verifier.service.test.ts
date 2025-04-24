import { jest } from "@jest/globals";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { REQUEST } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthorizationRequest,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { AppError } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { ClientsService } from "../../clients/clients.service.js";
import { RootConfig } from "../../config.js";
import { KubernetesService } from "../../k8s/kubernetes.service.js";
import { OauthClient } from "../../model/client.dao.js";
import { KeyDao } from "../../model/keys.dao.js";
import { AuthorizationRequestDao } from "../../model/oid4vp.dao.js";
import { OauthRole } from "../../model/role.dao.js";
import { TokenDao } from "../../model/token.dao.js";
import { OauthUser } from "../../model/user.dao.js";
import { OauthService } from "../../oauth/oauth.service.js";
import { TokenService } from "../../oauth/token.service.js";
import { RolesService } from "../../roles/roles.service.js";
import { UsersService } from "../../users/users.service.js";
import { PresentationService } from "../presentation.service.js";
import { OID4VPVerifierService } from "./verifier.service.js";

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
          OauthRole,
          OauthClient,
          TokenDao,
          KeyDao
        ]),
        TypeOrmModule.forFeature([
          AuthorizationRequestDao,
          OauthUser,
          OauthRole,
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
        RolesService,
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
        },
        {
          provide: REQUEST,
          useValue: {
            session: {
              user: null
            }
          }
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
