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
import { IatpHolderService } from "./holder.service.js";
import { IatpVerifierService } from "./verifier.service.js";
import { IatpSiopService } from "./siop.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { SIToken } from "../../model/iatp.dao.js";
import crypto from "crypto";
import { toArray } from "../../utils/unions.js";
import { DIDDocuments, DIDService } from "../../model/did.dao.js";

describe("Presentation Service", () => {
  let presentationService: PresentationService;
  let iatpSiopService: IatpSiopService;
  let iatpHolderService: IatpHolderService;
  let iatpVerifierService: IatpVerifierService;
  let server: SetupServer;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true,
        },
        {
          id: "key-1",
          type: "EdDSA",
          default: false,
        },
      ],
      initCredentials: [
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential`,
          keyId: "key-1",
          credentialSubject: {
            id: "did:web:localhost",
            "urn:tsg:subjectProp": "test",
          },
        },
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential-2`,
          keyId: "key-1",
          credentialSubject: {
            id: "did:web:localhost",
            "urn:tsg:subjectProp": "test2",
          },
        },
      ],
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          Credentials,
          DIDDocuments,
          DIDService,
          KeyMaterials,
          SIToken,
        ]),
        TypeOrmModule.forFeature([
          Credentials,
          DIDDocuments,
          DIDService,
          KeyMaterials,
          SIToken,
        ]),
      ],
      providers: [
        SignatureService,
        IatpSiopService,
        IatpHolderService,
        IatpVerifierService,
        CredentialsService,
        DidService,
        DidResolverService,
        KeysService,
        PresentationService,
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();
    iatpSiopService = await moduleRef.get(IatpSiopService);
    iatpHolderService = await moduleRef.get(IatpHolderService);
    iatpVerifierService = await moduleRef.get(IatpVerifierService);
    presentationService = await moduleRef.get(PresentationService);
    const didService = await moduleRef.get(DidService);
    await didService.initialized;
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        const didDocument = await didService.getDid();
        return HttpResponse.json(didDocument);
      }),
      http.get(
        "http://localhost:3000/iatp/holder/presentation",
        async (ctx) => {
          const authorization = ctx.request.headers.get("Authorization");
          const presentationDefinition = JSON.parse(
            new URL(ctx.request.url).searchParams.get(
              "presentation_definition"
            )!
          );
          const result = await iatpHolderService.presentationRequest(
            presentationDefinition,
            authorization!
          );
          return HttpResponse.json(result);
        }
      )
    );
    server.listen({ onUnhandledRequest: "bypass" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("IATP Flow", () => {
    it("SIOP Test", async () => {
      const holderIdToken = await iatpSiopService.createSelfIssuedIDToken(
        "did:web:localhost",
        true
      );
      console.log(holderIdToken);

      const validatedHolderIdToken = await iatpSiopService.validateIDToken(
        holderIdToken
      );
      console.log(validatedHolderIdToken);

      const verifierIdToken = await iatpSiopService.createSelfIssuedIDToken(
        "did:web:localhost",
        false,
        undefined,
        validatedHolderIdToken.token as string
      );
      console.log(verifierIdToken);

      const validateVerifierIdToken =
        await iatpSiopService.validateIDTokenWithAccessToken(verifierIdToken);
      console.log(validateVerifierIdToken);
    });

    it("Presentation flow", async () => {
      const holderIdToken = await iatpSiopService.createSelfIssuedIDToken(
        "did:web:localhost",
        true
      );
      const vp = await iatpVerifierService.verify(holderIdToken, {
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
                    pattern: "VerifiableCredential",
                  },
                },
              ],
            },
          },
        ],
      });
      const vp2 = await iatpVerifierService.verify(holderIdToken, {
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
                    pattern: "VerifiableCredential",
                  },
                },
                {
                  path: ["$.issuer"],
                  filter: {
                    type: "string",
                    pattern: "did:web:localhost|did:web:trustedIssuer.com",
                  },
                },
                {
                  path: ["$.credentialSubject['urn:tsg:subjectProp']"],
                  filter: {
                    type: "string",
                    const: "test",
                  },
                },
              ],
            },
          },
        ],
      });
      const vp3 = await iatpVerifierService.verify(holderIdToken, {
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
                    pattern: "VerifiableCredential",
                  },
                },
                {
                  path: ["$.credentialSubject['urn:tsg:subjectProp']"],
                  filter: {
                    type: "string",
                    const: "test2",
                  },
                },
              ],
            },
          },
        ],
      });
      expect(toArray(vp2.verifiableCredential)[0].id).toBe(
        "did:web:localhost#test-init-credential"
      );
      expect(toArray(vp3.verifiableCredential)[0].id).toBe(
        "did:web:localhost#test-init-credential-2"
      );
    });
  });
});
