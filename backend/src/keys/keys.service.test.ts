import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsService } from "../credentials/credentials.service.js";
import { plainToInstance } from 'class-transformer';
import { RootConfig } from '../config.js';
import { TypeOrmTestHelper } from '../utils/testhelper.js';
import { Credentials, DIDDocuments, KeyMaterials } from '../model/credentials.dao.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DidService } from '../did/did.service.js';
import { KeysService } from './keys.service.js';
import { describe, expect, beforeAll, afterAll, it, jest } from '@jest/globals';

describe("Key Service", () => {
  let keyService: KeysService
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [{
        id: "key-0",
        type: "EdDSA",
        default: false
      }],
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([Credentials, DIDDocuments, KeyMaterials]),
        TypeOrmModule.forFeature([Credentials, DIDDocuments, KeyMaterials])
      ],
      providers: [
        CredentialsService,
        DidService,
        KeysService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    keyService = await moduleRef.get(KeysService);
    await keyService.initialized;
    await keyService.init();
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Key management", () => {
    it("Get initial keys", async () => {
      const keys = await keyService.getKeys();
      expect(keys).toHaveLength(1);

      const key = await keyService.getKey('key-0');
      expect(key).toBeDefined();
    });
    it("Get non-existing key", async () => {
      await expect(keyService.getKey('key-1')).rejects.toThrow("can't be found")
    });
    it("Default key", async () => {
      await expect(keyService.getDefaultKey()).rejects.toThrow("No default key present");
      await keyService.changeDefaultKey('key-0');
      const key = await keyService.getDefaultKey();
      expect(key).toBeDefined();
      expect(key.id).toBe('key-0')
    });
    it("Add keys", async () => {
      await expect(keyService.addKey({
        id: 'key-0',
        type: 'EdDSA',
        default: true
      })).rejects.toThrow("already exists");
      const es384key = await keyService.addKey({
        id: 'key-1',
        type: 'ES384',
        default: true
      });
      expect(es384key).toBeDefined();
      expect(es384key.type).toBe('ES384');
      const x509key = await keyService.addKey({
        id: 'key-2',
        type: 'X509',
        existingKey: '-----BEGIN PRIVATE KEY-----\n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\nvvjvRauvhFHfsn0RsA5cmV5JR6pY\n-----END PRIVATE KEY-----',
        existingCertificate: '-----BEGIN CERTIFICATE-----\nMIIFCzCCAvOgAwIBAgIUK/EBw4YkgokKUEUXHPlxDSezMuYwDQYJKoZIhvcNAQEL\nBQAwFTETMBEGA1UEAwwKV2FsbGV0VGVzdDAeFw0yNDAxMDMxMDM1NDVaFw0zMzEy\nMzExMDM1NDVaMBUxEzARBgNVBAMMCldhbGxldFRlc3QwggIiMA0GCSqGSIb3DQEB\nAQUAA4ICDwAwggIKAoICAQCU/tlRNTfxoC0VOiz+/shjjimyEIalv5qhm2xLuoYS\n/IoKvRpCngWgfOCXedUIMf9nKYC9RHRJhaX/sWwys+j/p8Ocl1Gs1/nDe8SA0YIO\np6mO0OPqgq5VyMIbJHJ1TL50zlEDOBMd3AG97wLa//V6QqFdVnR7jT8sTp2x7vmn\n9S1cW5F6Ze/yg8FRhKU9zsaHOHtYLXLKVHg8mj+pJy5RuKp+kCACVoT+AB2ue8EA\nV793x6l12Y3IdGRGqFwvDybrD8lGdcBevyQ0qFi9OgDRkDPzUiSfVbaS5z4938HL\nk1Qn0pqmFH/TitBg9gBJ2/mVz+DjgkL4Drv5CQocUurwnjWI7KYdhdfMB5Su7m3R\nI9tP+gDtHkG6ND7x/70RkSeDaqtryuD8pJAEktg/+NVDd2/SLgoNed2Mj2GCG9c+\nalHPJ76aMmDDOS3FN5biBsfwAzkyun/ewesCcISN2f+f1xQ1Q9QnPV0vpga6leSE\ntNx0/+J5bGXt3KpAAGIY6QAeHkGdsla2BP47LZ1PEo0y1Zg8OIzwXCLyI1H53ldz\nh5d9wwpV/kZtVMmzW7PCAh9DG54ikAoM29KGzL9iEq82nEp+D8fsyrhix0E/j6tO\nTByYXvk+2UbHTVc1ATn1DubRFtpwIP3tGwJHOCqY4gu3AHOdlo4K9UHELey3V+T5\ntQIDAQABo1MwUTAdBgNVHQ4EFgQUox9EEtQAuK8xkieS1S7RakayMC8wHwYDVR0j\nBBgwFoAUox9EEtQAuK8xkieS1S7RakayMC8wDwYDVR0TAQH/BAUwAwEB/zANBgkq\nhkiG9w0BAQsFAAOCAgEABTTcOjmY/YLxtk8Nj03y0Il+d4UU2P9DPWsDktDNaw+r\npO3uv9bL0mkssZzviCI+dsbIwkg/Fj8IGbVyOHLShEHOR+O20x+nJvZm/V2vC1Ry\nEw7iFvvTqNToq5Z3BbNeldfzvl/AP223Zyv+O0i0BArpBJHbcMYvBuWYMFtsZeyc\nEc9O6IPGd0gY95yHOhUSUSER/i+mpEbas8LuOmOEeUCfG7rFG7WBSljlnoToda3b\njh56yDaFZQSQGmOPnCRIFubpKUqzunNY3EsHswCTyqkxKvJU7nab3yWknQyRUMTi\nDwXA7qI/N0TFIhzjnrkbR/rilQihJK9cMVC2sBTO2jTU4euY7tkXgbUqXuGkBvTs\nvWKv2ED52B01YYncQ582HoU1QF8SOVeUgQeOBUvYTDE/I5pzBBoPr4VPx4BA6PTH\n4/J+sdLKI0b12ENVF+swXsBQrjMRhCV8iBeOkt84rGFloDAp1+3nnyakhU1wniTi\nGfBj12ksSZ4xPDcxAlyHsvYMbhYi+ZnhzIlCO0SGE+SoOLyUw1HRGBbDYJ0vuJnd\nNmrx+q+0iHXZTWtb5QcZOOOzH+FJXU3jqlHwINkKVShnEql+03XGanScdN3QWRhk\nH5WWKmk8aR+3jW6hmXZWWc3XTXHIqp3L9ayYZTCA371PVf6BhTakR00Yv61MUy4=\n-----END CERTIFICATE-----',
        default: false
      });
      expect(x509key).toBeDefined();
      expect(x509key.type).toBe('X509');
    });
    it("Delete keys", async () => {
      await keyService.deleteKey("key-1");
      await expect(keyService.getKey('key-1')).rejects.toThrow("can't be found");
      await expect(keyService.deleteKey('key-1')).rejects.toThrow("can't be found");
    });
  })
})