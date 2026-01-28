import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import {
  signAsJws,
  validateDataIntegrityProof,
  validateJwt,
  verifyJws
} from "@tsg-dsp/common-signing-and-validation";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RootConfig } from "../config.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { KeysService } from "./keys.service.js";
import { SignatureService } from "./signature.service.js";

describe("Key Service", () => {
  let signatureService: SignatureService;
  let server: SetupServer;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: false
        },
        {
          id: "key-2",
          type: "ES384",
          default: false
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
          DIDLogs
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs
        ])
      ],
      providers: [
        CredentialsService,
        DidService,
        KeysService,
        SignatureService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    const keyService = moduleRef.get(KeysService);
    await keyService.initialized;
    await keyService.init();
    await keyService.addKey({ id: "key-10", type: "EdDSA", default: true });
    signatureService = moduleRef.get(SignatureService);

    const didService = moduleRef.get(DidService);
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

  describe("Signature service", () => {
    it("JWT signing and validation", async () => {
      await signatureService.signAsJwt({ test: "test" }, "did:web:localhost", {
        expirationTime: 5 * 60 * 1000 // 5 minutes
      });
      const jwt = await signatureService.signAsJwt(
        { test: "test" },
        "did:web:localhost",
        {
          key: "key-0",
          jti: crypto.randomUUID()
        }
      );
      await validateJwt(jwt);
    });
    const fromBase64 = (base64: string) =>
      JSON.parse(Buffer.from(base64, "base64").toString());
    const toBase64 = (obj: any) =>
      Buffer.from(JSON.stringify(obj)).toString("base64");
    it("JWT validation errors", async () => {
      const emptyJsonEncoded = toBase64({});
      await expect(
        validateJwt(`${emptyJsonEncoded}.${emptyJsonEncoded}.`)
      ).rejects.toThrow("Could not validate JWT. Missing Key ID in JWT");
      await expect(
        validateJwt(`${toBase64({ kid: "key-0" })}.${emptyJsonEncoded}.`)
      ).rejects.toThrow("Could not validate JWT. Missing issuer in JWT");

      const [header, body, signature] = (
        await signatureService.signAsJwt(
          { test: "test" },
          "did:web:localhost",
          {
            key: "key-0",
            jti: crypto.randomUUID()
          }
        )
      ).split(".");
      const headerParsed = fromBase64(header);
      headerParsed.kid = "unknown-key";
      await expect(
        validateJwt(`${toBase64(headerParsed)}.${body}.${signature}`)
      ).rejects.toThrow('Could not find matching public key for "unknown-key"');
      headerParsed.kid = "key-0";
      await expect(
        validateJwt(`${toBase64(headerParsed)}.${body}.${signature}`)
      ).rejects.toThrow("Invalid JWT signature for key");
    });

    it("sign JWS", async () => {
      const defaultKey = await signatureService["getKey"]();
      const key0 = await signatureService["getKey"]("key-0");

      const jwsDefault = await signAsJws(
        Buffer.from("123456"),
        defaultKey.type,
        defaultKey.privateKey
      );
      await verifyJws(jwsDefault, defaultKey.publicKey, Buffer.from("123456"));
      const jwsKey0 = await signAsJws(
        Buffer.from("123456"),
        key0.type,
        key0.privateKey
      );
      await verifyJws(jwsKey0, key0.publicKey, Buffer.from("123456"));
      await expect(
        verifyJws(jwsKey0, defaultKey.publicKey, Buffer.from("123456"))
      ).rejects.toThrow("Verification failed");
    });
    it("DataIntegrityProof", async () => {
      const document = {
        "@context": {
          schema: "http://schema.org",
          Person: {
            "@id": "schema:Person"
          },
          name: {
            "@id": "schema:name"
          },
          jobTitle: {
            "@id": "schema:jobTitle"
          },
          url: {
            "@id": "schema:url",
            "@type": "@id"
          },
          telephone: {
            "@id": "schema:telephone"
          }
        },
        "@type": "Person",
        name: "Jane Doe",
        jobTitle: "Professor",
        url: "http://www.janedoe.com",
        telephone: "(425) 123-4567"
      };
      const proof = await signatureService.signAsDataIntegrityProof(
        "RDFC",
        document
      );
      await validateDataIntegrityProof(document, proof);
      const proof2 = await signatureService.signAsDataIntegrityProof(
        "RDFC",
        document,
        undefined,
        undefined,
        undefined,
        true
      );
      await validateDataIntegrityProof(document, proof2);
      await expect(
        validateDataIntegrityProof(document, {
          ...proof2,
          verificationMethod: undefined
        })
      ).rejects.toThrow(
        "Only DataIntegrityProofs supported with verificationMethod present"
      );
      const proof3 = await signatureService.signAsDataIntegrityProof(
        "JCS",
        document
      );
      await validateDataIntegrityProof(document, proof3);
    });
  });
});
