import { describe, expect, beforeAll, afterAll, it, jest } from '@jest/globals';
import { IssuanceService } from './issuance.service';
import { TypeOrmTestHelper } from '../utils/testhelper';
import { plainToInstance } from 'class-transformer';
import { RootConfig } from '../config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credentials, DIDDocuments, KeyMaterials } from '../model/credentials.dao';
import { CredentialsService } from '../credentials/credentials.service';
import { DidService } from '../did/did.service';
import { DIDResolver } from '../did/didResolver.service';
import { KeysService } from '../keys/keys.service';
import { PresentationService } from '../presentation/presentation.service';
import { CIAccessToken, CredentialIssuance } from '../model/issuance.dao';
import { http, HttpResponse } from 'msw';
import { SetupServer, setupServer } from 'msw/node';
import { OfferGrants } from '../model/issuance.dto';

describe("Issuance Service", () => {
  let issuanceService: IssuanceService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [{
        id: "key-0",
        type: "EdDSA",
        default: true
      }],
      contexts: [{
        id: 'Example',
        credentialType: 'ExampleCredentialType',
        issuable: true,
        documentUrl: 'https://example.com/context.json'
      }]
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([Credentials, DIDDocuments, KeyMaterials, CredentialIssuance, CIAccessToken]),
        TypeOrmModule.forFeature([Credentials, DIDDocuments, KeyMaterials, CredentialIssuance, CIAccessToken])
      ],
      providers: [
        CredentialsService,
        DidService,
        DIDResolver,
        KeysService,
        PresentationService,
        IssuanceService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    issuanceService = await moduleRef.get(IssuanceService);
    const didService = await moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    server = setupServer(
      http.get('http://localhost/.well-known/did.json', async () => {
        return HttpResponse.json(await didService.getDid())
      }),
      http.get('https://example.com/context.json', () => {
        return HttpResponse.json({
          "@context": {
            "@protected": true,
            "@version": 1.1,
            "ExampleCredentialType": {
              "@context": [
                "https://www.w3.org/2018/credentials/v1"
              ],
              "@id": "example:ExampleCredentialType"
            },
            "example": "https://example.dataspac.es/credentials/",
            "id": "@id",
            "type": "@type"
          }
        })
      })
    );
    server.listen({onUnhandledRequest: "bypass"});
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Issuance process", () => {
    it("Create offer", async () => {
      const offer = await issuanceService.createCredentialOffer("did:web:example.com", "ExampleCredentialType", {id: "did:web:example.com"});
      const access_token = await issuanceService.createAccessToken(offer.grants?.[OfferGrants.PRE_AUTHORIZATION_CODE]?.['pre-authorization_code'] ?? "");
      const credential = await issuanceService.handleCredentialRequest(access_token.access_token, {
        format: "jwt_vc_json-ld",
        proof: {
          proof_type: "ldp_vp",
          ldp_vp: {
            '@context': ['https://www.w3.org/ns/credentials/v2'],
            type: ['VerifiablePresentation'],
            holder: 'did:web:example.com',
            proof: {
              type: 'DataIntegrityProof',
              cryptosuite: "eddsa-2022",
              proofPurpose: 'authentication',
              verificationMethod: "did:web:example.com#KEY-ID",
              created: "2023-03-01T14:56:29.280619Z",
              challenge: "82d4cb36-11f6-4273-b9c6-df1ac0ff17e9",
              domain: "did:web:audience.company.com",
              proofValue: "z5hrbHzZiqXHNpLq6i7zePEUcUzEbZKmWfNQzXcUXUrqF7bykQ7ACiWFyZdT2HcptF1zd1t7NhfQSdqrbPEjZceg7"
            }
          }
        }
      });
      console.log(JSON.stringify(credential))
    })
  })
})