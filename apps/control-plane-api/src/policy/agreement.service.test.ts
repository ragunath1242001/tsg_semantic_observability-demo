import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ODRLAction } from "@tsg-dsp/common-dsp";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { AgreementService } from "./agreement.service";
import { ConstraintDao, RuleDao } from "../model/rule.dao";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao";
import { ScheduleModule } from "@nestjs/schedule";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../model/negotiation.dao";
import { TransferDetailDao, TransferEventDao } from "../model/transfer.dao";

describe("Agreement Service", () => {
  let agreementService: AgreementService;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          ConstraintDao,
          RuleDao,
          AgreementDao,
          TransferMonitorDao,
          TransferDetailDao,
          TransferEventDao,
          NegotiationDetailDao,
          NegotiationProcessEventDao
        ]),
        TypeOrmModule.forFeature([
          ConstraintDao,
          RuleDao,
          AgreementDao,
          TransferMonitorDao,
          TransferDetailDao,
          TransferEventDao,
          NegotiationDetailDao,
          NegotiationProcessEventDao
        ]),
        ScheduleModule.forRoot()
      ],
      providers: [AgreementService]
    }).compile();
    agreementService = moduleRef.get(AgreementService);
  });
  describe("Management", () => {
    it("Store agreement", async () => {
      await agreementService["agreementRepository"].query(
        "PRAGMA foreign_keys = 0"
      );
      await agreementService.storeAgreement(
        {
          "@type": "odrl:Agreement",
          "@id": "urn:uuid:00000000-0000-0000-0000-000000000000",
          "odrl:assigner": "did:web:localhost",
          "odrl:assignee": "did:web:remote.com",
          "dspace:timestamp": new Date("2024-08-01T12:00:00Z").toISOString(),
          "odrl:target": "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6",
          "odrl:permission": [
            {
              "@type": "odrl:Permission",
              "odrl:action": ODRLAction.USE
            }
          ]
        },
        "urn:uuid:00000000-0000-0000-0000-000000000000"
      );
      await agreementService["agreementRepository"].query(
        "PRAGMA foreign_keys = 1"
      );
    });
    it("Get agreement", async () => {
      const agreementDao = await agreementService.getAgreementDao(
        "urn:uuid:00000000-0000-0000-0000-000000000000"
      );
      expect(agreementDao.id).toBe(
        "urn:uuid:00000000-0000-0000-0000-000000000000"
      );
      await expect(
        agreementService.getAgreementDao(
          "urn:uuid:40272dba-71fe-47ec-843a-c08fdadc5b51"
        )
      ).rejects.toThrow("not found");
      const agreement = await agreementService.getAgreement(
        "urn:uuid:00000000-0000-0000-0000-000000000000"
      );
      expect(agreement.id).toBe(
        "urn:uuid:00000000-0000-0000-0000-000000000000"
      );
      const agreementDto = await agreementService.getAgreement(
        "urn:uuid:00000000-0000-0000-0000-000000000000",
        true
      );
      expect(agreementDto["@id"]).toBe(
        "urn:uuid:00000000-0000-0000-0000-000000000000"
      );
      await expect(
        agreementService.getAgreement(
          "urn:uuid:40272dba-71fe-47ec-843a-c08fdadc5b51"
        )
      ).rejects.toThrow("not found");
    });
  });
});
