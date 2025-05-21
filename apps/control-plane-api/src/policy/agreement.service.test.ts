import { ScheduleModule } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { ODRLAction } from "@tsg-dsp/common-dsp";

import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../model/negotiation.dao.js";
import { ConstraintDao, RuleDao } from "../model/rule.dao.js";
import { TransferDetailDao, TransferEventDao } from "../model/transfer.dao.js";
import { AgreementService } from "./agreement.service.js";

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
          "@type": "Agreement",
          "@id": "urn:uuid:00000000-0000-0000-0000-000000000000",
          assigner: "did:web:localhost",
          assignee: "did:web:remote.com",
          timestamp: new Date("2024-08-01T12:00:00Z").toISOString(),
          target: "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6",
          permission: [
            {
              "@type": "Permission",
              action: ODRLAction.USE
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
