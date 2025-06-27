import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { toArray } from "@tsg-dsp/common-dsp";
import { PresentationQueryMessage } from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../../model/credentials.dao.js";
import { SIToken } from "../../model/dcp.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { PresentationService } from "../presentation.service.js";
import { DCPHolderService } from "./holder.service.js";
import { DCPVerifierService } from "./verifier.service.js";

describe("Presentation Service", () => {
  let dcpSiopService: SecureTokenService;
  let dcpHolderService: DCPHolderService;
  let dcpVerifierService: DCPVerifierService;
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
            id: "did:web:localhost",
            "urn:tsg:subjectProp": "test"
          }
        },
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential-2`,
          keyId: "key-1",
          credentialSubject: {
            id: "did:web:localhost",
            "urn:tsg:subjectProp": "test2"
          }
        }
      ]
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          SIToken,
          DIDLogs
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          SIToken,
          DIDLogs
        ])
      ],
      providers: [
        SignatureService,
        SecureTokenService,
        DCPHolderService,
        DCPVerifierService,
        CredentialsService,
        DidService,
        KeysService,
        PresentationService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    dcpSiopService = await moduleRef.get(SecureTokenService);
    dcpHolderService = await moduleRef.get(DCPHolderService);
    dcpVerifierService = await moduleRef.get(DCPVerifierService);
    const didService = await moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        const didDocument = await didService.getDid();
        return HttpResponse.json(didDocument);
      }),
      http.post(
        "http://localhost:3000/api/dcp/presentations/query",
        async (ctx) => {
          const authorization = ctx.request.headers.get("Authorization");
          const presentationQueryMessage = await ctx.request.json();
          const result = await dcpHolderService.presentationQuery(
            presentationQueryMessage as PresentationQueryMessage,
            authorization!
          );
          return HttpResponse.json(result);
        }
      ),
      http.get("http://localhost:3000/credentials/status-0", async () => {
        const credentialDao = await moduleRef
          .get(CredentialsService)
          .getCredential("http://localhost:3000/credentials/status-0");
        return HttpResponse.json(credentialDao.credential);
      })
    );
    server.listen({ onUnhandledRequest: "warn" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("DCP Elements", () => {
    it("PresentationDefinition handling", async () => {
      const credentials = await dcpHolderService.evaluatePresentationDefinition(
        {
          id: crypto.randomUUID(),
          input_descriptors: [
            {
              id: crypto.randomUUID(),
              constraints: {
                fields: [
                  {
                    path: ["$.type"],
                    filter: {
                      type: "string",
                      pattern: "VerifiableCredential"
                    }
                  }
                ]
              }
            }
          ]
        }
      );
      expect(credentials).toHaveLength(1);
    });
  });

  describe("DCP Flow", () => {
    it("SIOP Test", async () => {
      const holderIdToken = await dcpSiopService.createSelfIssuedIDToken({
        audience: "did:web:localhost",
        createAccessToken: true
      });
      console.log(holderIdToken);

      const validatedHolderIdToken =
        await dcpSiopService.validateIDToken(holderIdToken);
      console.log(validatedHolderIdToken);

      const verifierIdToken = await dcpSiopService.createSelfIssuedIDToken({
        audience: "did:web:localhost",
        createAccessToken: false,
        scope: undefined,
        existingAccessToken: validatedHolderIdToken.token as string
      });
      console.log(verifierIdToken);

      const validateVerifierIdToken =
        await dcpSiopService.validateIDTokenWithAccessToken(verifierIdToken);
      console.log(validateVerifierIdToken);
    });

    it("Presentation flow", async () => {
      const holderToken = async () =>
        dcpSiopService.createSelfIssuedIDToken({
          audience: "did:web:localhost",
          createAccessToken: true
        });
      const token = await holderToken();
      await dcpVerifierService.verify(token, {
        id: crypto.randomUUID(),
        input_descriptors: [
          {
            id: crypto.randomUUID(),
            constraints: {
              fields: [
                {
                  path: ["$.type"],
                  filter: {
                    type: "string",
                    pattern: "VerifiableCredential"
                  }
                }
              ]
            }
          }
        ]
      });
      await expect(
        dcpVerifierService.verify(token, {
          id: crypto.randomUUID(),
          input_descriptors: [
            {
              id: crypto.randomUUID(),
              constraints: {
                fields: [
                  {
                    path: ["$.type"],
                    filter: {
                      type: "string",
                      pattern: "VerifiableCredential"
                    }
                  }
                ]
              }
            }
          ]
        })
      ).rejects.toThrow("Could not validate JWT");
      const vp2 = await dcpVerifierService.verify(await holderToken(), {
        id: crypto.randomUUID(),
        input_descriptors: [
          {
            id: crypto.randomUUID(),
            constraints: {
              fields: [
                {
                  path: ["$.type"],
                  filter: {
                    type: "string",
                    pattern: "VerifiableCredential"
                  }
                },
                {
                  path: ["$.issuer"],
                  filter: {
                    type: "string",
                    pattern: "did:web:localhost|did:web:trustedIssuer.com"
                  }
                },
                {
                  path: ["$.credentialSubject['urn:tsg:subjectProp']"],
                  filter: {
                    type: "string",
                    const: "test"
                  }
                }
              ]
            }
          }
        ]
      });
      const vp3 = await dcpVerifierService.verify(await holderToken(), {
        id: crypto.randomUUID(),
        input_descriptors: [
          {
            id: crypto.randomUUID(),
            constraints: {
              fields: [
                {
                  path: ["$.type"],
                  filter: {
                    type: "string",
                    pattern: "VerifiableCredential"
                  }
                },
                {
                  path: ["$.credentialSubject['urn:tsg:subjectProp']"],
                  filter: {
                    type: "string",
                    const: "test2"
                  }
                }
              ]
            }
          }
        ]
      });
      expect(toArray(vp2[0].verifiableCredential)[0].id).toBe(
        "did:web:localhost#test-init-credential"
      );
      expect(toArray(vp3[0].verifiableCredential)[0].id).toBe(
        "did:web:localhost#test-init-credential-2"
      );
    });
  });
});
