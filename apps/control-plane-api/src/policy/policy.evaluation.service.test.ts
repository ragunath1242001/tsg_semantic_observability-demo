import { ScheduleModule } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Paginated, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { ODRLAction, TransferState, TransferStatus } from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";

import { RootConfig } from "../config.js";
import { TransferService } from "../dsp/transfer/transfer.service.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../model/negotiation.dao.js";
import { ConstraintDao, RuleDao } from "../model/rule.dao.js";
import { TransferDetailDao, TransferEventDao } from "../model/transfer.dao.js";
import { AgreementMonitorService } from "./agreement.monitor.service.js";
import { AgreementService } from "./agreement.service.js";
import {
  ConstraintModel,
  ConstraintType,
  DataType,
  EvaluationTrigger
} from "./constraint.dto.js";
import { EvaluationContext } from "./evaluation.dto.js";
import { Evaluation, promiseMap } from "./evaluation.js";
import { PolicyEvaluationService } from "./policy.evaluation.service.js";
import { RuleRepositoryService } from "./rule.repository.service.js";

describe("Policy Evaluation Service", () => {
  let ruleRepositoryService: RuleRepositoryService;
  let policyEvaluationService: PolicyEvaluationService;
  let agreementService: AgreementService;
  let agreementMonitorService: AgreementMonitorService;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          ConstraintDao,
          RuleDao,
          TransferMonitorDao,
          AgreementDao,
          TransferDetailDao,
          TransferEventDao,
          NegotiationDetailDao,
          NegotiationProcessEventDao
        ]),
        TypeOrmModule.forFeature([
          ConstraintDao,
          RuleDao,
          TransferMonitorDao,
          AgreementDao,
          TransferDetailDao,
          TransferEventDao,
          NegotiationDetailDao,
          NegotiationProcessEventDao
        ]),
        ScheduleModule.forRoot()
      ],
      providers: [
        RuleRepositoryService,
        PolicyEvaluationService,
        AgreementService,
        AgreementMonitorService,
        {
          provide: TransferService,
          useValue: {
            async getTransfers(): Promise<Paginated<TransferStatus[]>> {
              return {
                data: [
                  {
                    state: TransferState.STARTED,
                    id: "urn:uuid:3337c8dc-c512-4653-983a-6ea32277f870"
                  } as unknown as TransferStatus,
                  {
                    state: TransferState.STARTED,
                    id: "urn:uuid:00000000-0000-0000-0000-000000000000"
                  } as unknown as TransferStatus
                ],
                total: 2
              };
            },
            async suspend() {}
          }
        },
        {
          provide: RootConfig,
          useValue: plainToClass(RootConfig, {
            iam: { type: "dev", didId: "did:web:localhost" }
          })
        }
      ]
    }).compile();

    ruleRepositoryService = moduleRef.get(RuleRepositoryService);
    policyEvaluationService = moduleRef.get(PolicyEvaluationService);
    agreementService = moduleRef.get(AgreementService);
    agreementMonitorService = moduleRef.get(AgreementMonitorService);

    await ruleRepositoryService.addConstraint(
      ConstraintModel.parse({
        type: ConstraintType.ATOMIC,
        title: "Test Constraint 6",
        description: "Test constraint description 6",
        leftOperand: "tsg:testString2",
        operator: "tsg:unknown",
        contextPath: "$.dataPlane.testString",
        dataType: DataType.STRING,
        evaluable: [
          EvaluationTrigger.PROVIDER_ON_REQUEST,
          EvaluationTrigger.PROVIDER_CONTINUOUS,
          EvaluationTrigger.PROVIDER_ON_EXECUTION
        ]
      })
    );
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Evaluate", () => {
    const contextDefaults: EvaluationContext = {
      role: "provider",
      scope: EvaluationTrigger.PROVIDER_ON_REQUEST,
      localParticipant: "did:web:localhost",
      remoteParticipant: "did:web:remote.com",
      target: "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6",
      action: ODRLAction.USE,
      verifiableCredentials: [],
      evaluationTime: new Date("2024-08-01T12:00:00Z"),
      policy: {
        agreement: {
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
        localSignature: {
          algorithm: "jwt",
          digest: ""
        },
        remoteSignature: {
          algorithm: "jwt",
          digest: ""
        },
        signatureStatus: "verified"
      }
    };
    it("Evaluate", async () => {
      const context = EvaluationContext.parse({
        ...contextDefaults,
        dataPlane: {
          testString: "Test String",
          testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
          testNumber: 5,
          testDate: "2024-08-01"
        }
      });
      const evaluation = new Evaluation(context, ruleRepositoryService);
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "ALLOW"
      });
      evaluation["context"].target =
        "urn:uuid:00000000-0000-0000-0000-000000000000";
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "DENY"
      });
      evaluation["context"].target =
        "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6";
      evaluation["context"].role = "consumer";
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "DENY"
      });
      evaluation["context"].role = "provider";
      evaluation["context"].remoteParticipant = "did:web:localhost";
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "DENY"
      });
      evaluation["context"].remoteParticipant = "did:web:remote.com";
      evaluation["context"]["policy"]["agreement"]["prohibition"] = [
        {
          "@type": "Prohibition",
          action: ODRLAction.DELETE
        }
      ];
      evaluation["context"]["policy"]["agreement"]["obligation"] = [
        {
          "@type": "Duty",
          action: ODRLAction.INFORM
        }
      ];
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "ALLOW"
      });
      evaluation["context"]["policy"]["agreement"]["prohibition"] = [
        {
          "@type": "Prohibition",
          action: ODRLAction.USE
        }
      ];
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "DENY"
      });
      evaluation["context"]["policy"]["agreement"]["prohibition"] = [
        {
          "@type": "Prohibition",
          action: ODRLAction.USE,
          constraint: [
            {
              "@type": "Constraint",
              leftOperand: "tsg:testString2",
              operator: "tsg:unknown",
              rightOperand: "unknown"
            }
          ]
        }
      ];
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "DENY"
      });
      evaluation["context"]["policy"]["agreement"]["prohibition"] = undefined;
      evaluation["context"]["policy"]["agreement"]["permission"] = [
        {
          "@type": "Permission",
          action: ODRLAction.USE,
          constraint: [
            {
              "@type": "Constraint",
              leftOperand: "tsg:testString2",
              operator: "tsg:unknown",
              rightOperand: "unknown"
            }
          ]
        }
      ];
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "DENY"
      });
      evaluation["context"]["policy"]["agreement"]["permission"] = undefined;
      await expect(evaluation.evaluate()).resolves.toMatchObject({
        decision: "ALLOW"
      });
    });
    it("Promise map", async () => {
      await expect(
        promiseMap([1, 2, 3], async (i) => {
          if (i === 2) {
            throw Error("Test");
          } else {
            return i;
          }
        })
      ).rejects.toThrow("Test");
    });
    describe("Service", () => {
      it("Test evaluation", async () => {
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
        const context = EvaluationContext.parse({
          ...contextDefaults,
          transferId: "urn:uuid:89ce47c1-aa1c-4b97-8e82-f136e744552f",
          policy: {
            agreement: {
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
            localSignature: {
              algorithm: "jwt",
              digest: ""
            },
            remoteSignature: {
              algorithm: "jwt",
              digest: ""
            },
            signatureStatus: "verified"
          },
          dataPlane: {
            testString: "Test String",
            testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
            testNumber: 5,
            testDate: "2024-08-01"
          }
        });
        const result = await policyEvaluationService.evaluate(context);
        expect(result.decision).toBe("ALLOW");
      });
      it("Test context initialization", async () => {
        const context = await policyEvaluationService.initializeContext(
          "urn:uuid:00000000-0000-0000-0000-000000000000",
          "consumer",
          EvaluationTrigger.CONSUMER_ON_REQUEST,
          "urn:uuid:3337c8dc-c512-4653-983a-6ea32277f870",
          "did:web:remote.com",
          ODRLAction.USE,
          []
        );
        expect(context.role).toBe("consumer");
        const result = await policyEvaluationService.evaluate({
          ...context,
          dataPlane: {
            testString: "Test String",
            testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
            testNumber: 5,
            testDate: "2024-08-01"
          }
        });
        expect(result.decision).toBe("DENY");
        const result2 = await policyEvaluationService.evaluateDataPlane(
          "urn:uuid:3337c8dc-c512-4653-983a-6ea32277f870",
          {
            testString: "Test String",
            testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
            testNumber: 5,
            testDate: "2024-08-01"
          }
        );
        expect(result2.decision).toBe("DENY");
        await expect(
          policyEvaluationService.evaluateDataPlane(
            "urn:uuid:00000000-0000-0000-0000-000000000000",
            {
              testString: "Test String",
              testUri: "urn:uuid:bac46e31-79f8-4744-82c3-0b09012d2d95",
              testNumber: 5,
              testDate: "2024-08-01"
            }
          )
        ).rejects.toThrow("No context found");
        expect(
          (
            await policyEvaluationService.getLastDecision(
              "urn:uuid:3337c8dc-c512-4653-983a-6ea32277f870"
            )
          ).decision
        ).toBe("DENY");
        await expect(
          policyEvaluationService.getLastDecision(
            "urn:uuid:00000000-0000-0000-0000-000000000000"
          )
        ).rejects.toThrow("No decision found");
      });
    });
  });
  describe("Monitor", () => {
    it("", async () => {
      agreementMonitorService.onApplicationBootstrap();
      await agreementMonitorService.monitorAgreements();
      agreementMonitorService["schedulerRegistry"].deleteInterval(
        "monitorAgreements"
      );
    });
  });
});
