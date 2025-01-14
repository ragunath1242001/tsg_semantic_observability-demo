import { Test, TestingModule } from "@nestjs/testing";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../../config.js";
import { TypeOrmTestHelper } from "../../utils/testhelper.js";
import { Credentials, KeyMaterials } from "../../model/credentials.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DidService } from "../../did/did.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { PresentationService } from "../presentation.service.js";
import { describe, expect, beforeAll, afterAll, it, jest } from "@jest/globals";
import { DidResolverService } from "../../did/did.resolver.service.js";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { DCPHolderService } from "./holder.service.js";
import { DCPVerifierService } from "./verifier.service.js";
import { DCPSiopService } from "./siop.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { SIToken } from "../../model/dcp.dao.js";
import crypto from "crypto";
import { toArray } from "../../utils/unions.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { PresentationQueryMessage } from "@tsg-dsp/common-dtos";

describe("Presentation Service", () => {
  let presentationService: PresentationService;
  let dcpSiopService: DCPSiopService;
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
          Credentials,
          DIDDocuments,
          DIDService,
          KeyMaterials,
          SIToken,
          DIDLogs
        ]),
        TypeOrmModule.forFeature([
          Credentials,
          DIDDocuments,
          DIDService,
          KeyMaterials,
          SIToken,
          DIDLogs
        ])
      ],
      providers: [
        SignatureService,
        DCPSiopService,
        DCPHolderService,
        DCPVerifierService,
        CredentialsService,
        DidService,
        DidResolverService,
        KeysService,
        PresentationService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    dcpSiopService = await moduleRef.get(DCPSiopService);
    dcpHolderService = await moduleRef.get(DCPHolderService);
    dcpVerifierService = await moduleRef.get(DCPVerifierService);
    presentationService = await moduleRef.get(PresentationService);
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
      )
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
      const holderIdToken = await dcpSiopService.createSelfIssuedIDToken(
        "did:web:localhost",
        true
      );
      console.log(holderIdToken);

      const validatedHolderIdToken =
        await dcpSiopService.validateIDToken(holderIdToken);
      console.log(validatedHolderIdToken);

      const verifierIdToken = await dcpSiopService.createSelfIssuedIDToken(
        "did:web:localhost",
        false,
        undefined,
        validatedHolderIdToken.token as string
      );
      console.log(verifierIdToken);

      const validateVerifierIdToken =
        await dcpSiopService.validateIDTokenWithAccessToken(verifierIdToken);
      console.log(validateVerifierIdToken);
    });

    it("Presentation flow", async () => {
      const holderIdToken = await dcpSiopService.createSelfIssuedIDToken(
        "did:web:localhost",
        true
      );
      const vp = await dcpVerifierService.verify(holderIdToken, {
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
      const vp2 = await dcpVerifierService.verify(holderIdToken, {
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
      const vp3 = await dcpVerifierService.verify(holderIdToken, {
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
