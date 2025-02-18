import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { SetupServer } from "msw/node";
import { IamConfig, RootConfig } from "../config.js";
import { VCAuthService } from "./vc.auth.service.js";
import {
  mockWalletConfig,
  setupMockWalletServer
} from "./wallets/wallet.util.test.js";
import { AuthClientService, AuthConfig } from "@tsg-dsp/common-api";
import { Repository } from "typeorm";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";

describe("Auth Service", () => {
  let server: SetupServer;
  let iamConfig: IamConfig;

  beforeAll(async () => {
    server = setupMockWalletServer();
    iamConfig = mockWalletConfig();
  });

  afterAll(async () => {
    server.close();
  });

  let vcAuthService: VCAuthService;
  beforeEach(() => {
    vcAuthService = new VCAuthService(
      plainToInstance(RootConfig, { iam: iamConfig }),
      new AuthClientService(plainToInstance(AuthConfig, { enabled: false })),
      null as unknown as Repository<AgreementDao>,
      null as unknown as Repository<TransferMonitorDao>
    );
  });

  it("Request & validate token", async () => {
    const token = await vcAuthService.requestToken(iamConfig.didId);
    expect(token).toEqual(expect.any(String));

    const valid = await vcAuthService.validateToken(token);
    expect(valid).toBeDefined();
  });

  it("Test plainToInstance", async () => {
    const vp = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/suites/jws-2020/v1"
      ],
      type: ["VerifiablePresentation"],
      verifiableCredential: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3c.github.io/vc-jws-2020/contexts/v1/",
          "https://wallet.alpha.scsn.dataspac.es/context/SCSN"
        ],
        type: ["VerifiableCredential", "SCSNCredential"],
        id: `did:web:localhost#90277481-89fc-47c1-9fcb-7abbbe5aac6e`,
        issuer: "did:web:wallet.alpha.scsn.dataspac.es",
        issuanceDate: "2023-08-30T15:08:39.340Z",
        expirationDate: "2023-11-30T15:08:39.340Z",
        credentialSubject: {
          id: `did:web:localhost`,
          scsnIdentifier: "urn:scsn:23456789012345",
          scsnRole: "scsn:ServiceProvider"
        },
        proof: {
          type: "JsonWebSignature2020",
          created: "2023-08-30T15:08:39.887Z",
          proofPurpose: "assertionMethod",
          jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..cd2eKQ0eCQJCkqLVmEHZ_pqW_mm5wkOIzaM1bB4FphIKSaIEJhEU4fHKHGmsdVFHpTdmgvQ4e52YofA00ujvAg",
          verificationMethod: "did:web:wallet.alpha.scsn.dataspac.es#key-0"
        }
      }
    };

    plainToInstance(VerifiablePresentation, vp);
  });
});
