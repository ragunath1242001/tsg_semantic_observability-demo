import { DidKeyResolverStrategy } from "./did.key.resolver.strategy.js";

import { Test, TestingModule } from "@nestjs/testing";

describe("DID Key Resolver", () => {
  let didKeyResolverStrategy: DidKeyResolverStrategy;

  const sampleDidKeys = [
    // From https://w3c-ccg.github.io/did-method-key/#test-vectors
    {
      type: "Ed25519",
      didId: "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
      jwk: {
        kty: "OKP",
        crv: "Ed25519",
        x: "O2onvM62pC1io6jQKm8Nc2UyFXcd4kOmOsBIoYtZ2ik"
      }
    },
    {
      type: "Bls12381G2",
      didId:
        "did:key:zUC7K4ndUaGZgV7Cp2yJy6JtMoUHY6u7tkcSYUvPrEidqBmLCTLmi6d5WvwnUqejscAkERJ3bfjEiSYtdPkRSE8kSa11hFBr4sTgnbZ95SJj19PN2jdvJjyzpSZgxkyyxNnBNnY",
      jwk: {
        kty: "OKP",
        crv: "Bls12381G2",
        x: "tKWJu0SOY7onl4tEyOOH11XBriQN2JgzV-UmjgBMSsNkcAx3_l97SVYViSDBouTVBkBfrLh33C5icDD-4UEDxNO3Wn1ijMHvn2N63DU4pkezA3kGN81jGbwbrsMPpiOF"
      }
    },
    {
      type: "Secp256k1",
      didId: "did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme",
      jwk: {
        kty: "EC",
        crv: "secp256k1",
        x: "h0wVx_2iDlOcblulc8E5iEw1EYh5n1RYtLQfeSTyNc0",
        y: "O2EATIGbu6DezKFptj5scAIRntgfecanVNXxat1rnwE"
      }
    },
    {
      type: "P256",
      didId: "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169",
      jwk: {
        kty: "EC",
        crv: "P-256",
        x: "fyNYMN0976ci7xqiSdag3buk-ZCwgXU4kz9XNkBlNUI",
        y: "hW2ojTNfH7Jbi8--CJUo3OCbH3y5n91g-IMA9MLMbTU"
      }
    },
    {
      type: "P384",
      didId:
        "did:key:z82Lm1MpAkeJcix9K8TMiLd5NMAhnwkjjCBeWHXyu3U4oT2MVJJKXkcVBgjGhnLBn2Kaau9",
      jwk: {
        kty: "EC",
        crv: "P-384",
        x: "lInTxl8fjLKp_UCrxI0WDklahi-7-_6JbtiHjiRvMvhedhKVdHBfi2HCY8t_QJyc",
        y: "y6N1IC-2mXxHreETBW7K3mBcw0qGr3CWHCs-yl09yCQRLcyfGv7XhqAngHOu51Zv"
      }
    },
    {
      type: "P521",
      didId:
        "did:key:z2J9gaYxrKVpdoG9A4gRnmpnRCcxU6agDtFVVBVdn1JedouoZN7SzcyREXXzWgt3gGiwpoHq7K68X4m32D8HgzG8wv3sY5j7",
      jwk: {
        kty: "EC",
        crv: "P-521",
        x: "ASUHPMyichQ0QbHZ9ofNx_l4y7luncn5feKLo3OpJ2nSbZoC7mffolj5uy7s6KSKXFmnNWxGJ42IOrjZ47qqwqyS",
        y: "AW9ziIC4ZQQVSNmLlp59yYKrjRY0_VqO-GOIYQ9tYpPraBKUloEId6cI_vynCzlZWZtWpgOM3HPhYEgawQ703RjC"
      }
    }
  ];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DidKeyResolverStrategy]
    }).compile();
    didKeyResolverStrategy = moduleRef.get<DidKeyResolverStrategy>(
      DidKeyResolverStrategy
    );
  });

  describe("DID Web Resolvement", () => {
    it("Multibase to JWK conversions", async () => {
      const jwk0 = didKeyResolverStrategy["generateJwk"](
        sampleDidKeys[0].didId.split(":")[2]
      );
      expect(jwk0).toEqual(sampleDidKeys[0].jwk);
      const jwk1 = didKeyResolverStrategy["generateJwk"](
        sampleDidKeys[1].didId.split(":")[2]
      );
      expect(jwk1).toEqual(sampleDidKeys[1].jwk);
      const jwk2 = didKeyResolverStrategy["generateJwk"](
        sampleDidKeys[2].didId.split(":")[2]
      );
      expect(jwk2).toEqual(sampleDidKeys[2].jwk);
      const jwk3 = didKeyResolverStrategy["generateJwk"](
        sampleDidKeys[3].didId.split(":")[2]
      );
      expect(jwk3).toEqual(sampleDidKeys[3].jwk);
      const jwk4 = didKeyResolverStrategy["generateJwk"](
        sampleDidKeys[4].didId.split(":")[2]
      );
      expect(jwk4).toEqual(sampleDidKeys[4].jwk);
      const jwk5 = didKeyResolverStrategy["generateJwk"](
        sampleDidKeys[5].didId.split(":")[2]
      );
      expect(jwk5).toEqual(sampleDidKeys[5].jwk);
    });
    it("Resolve localhost main DID", async () => {
      for (const sample of sampleDidKeys) {
        const did = await didKeyResolverStrategy.resolve(sample.didId);
        const vmId = `${sample.didId}#${sample.didId.split(":")[2]}`;
        expect(did.id).toEqual(sample.didId);
        expect(did.verificationMethod![0].id).toEqual(vmId);
        expect(did.verificationMethod![0].publicKeyJwk).toEqual(sample.jwk);
        expect(did.authentication![0]).toEqual(vmId);
        expect(did.assertionMethod![0]).toEqual(vmId);
        expect(did.capabilityDelegation![0]).toEqual(vmId);
        expect(did.capabilityInvocation![0]).toEqual(vmId);
      }
    });
    it("Resolve non implemented DID", async () => {
      await expect(
        didKeyResolverStrategy.resolve(
          "did:key:z4MXj1wBzi9jUstyPMS4jQqB6KdJaiatPkAtVtGc6bQEQEEsKTic4G7Rou3iBf9vPmT5dbkm9qsZsuVNjq8HCuW1w24nhBFGkRE4cd2Uf2tfrB3N7h4mnyPp1BF3ZttHTYv3DLUPi1zMdkULiow3M1GfXkoC6DoxDUm1jmN6GBj22SjVsr6dxezRVQc7aj9TxE7JLbMH1wh5X3kA58H3DFW8rnYMakFGbca5CB2Jf6CnGQZmL7o5uJAdTwXfy2iiiyPxXEGerMhHwhjTA1mKYobyk2CpeEcmvynADfNZ5MBvcCS7m3XkFCMNUYBS9NQ3fze6vMSUPsNa6GVYmKx2x6JrdEjCk3qRMMmyjnjCMfR4pXbRMZa3i"
        )
      ).rejects.toThrow("No DID resolution support");
    });
  });
});
