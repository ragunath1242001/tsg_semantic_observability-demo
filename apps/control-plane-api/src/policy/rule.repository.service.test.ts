import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaginationOptionsDto, TypeOrmTestHelper } from "@tsg-dsp/common-api";

import { ConstraintDao, RuleDao } from "../model/rule.dao.js";
import {
  AtomicConstraint,
  ConstraintType,
  DataType,
  EvaluationTrigger,
  LogicalConstraint
} from "./constraint.dto.js";
import { Rule, RuleType } from "./rule.dto.js";
import { RuleRepositoryService } from "./rule.repository.service.js";

describe("Rule Repository Service", () => {
  let ruleRepositoryService: RuleRepositoryService;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([ConstraintDao, RuleDao]),
        TypeOrmModule.forFeature([ConstraintDao, RuleDao])
      ],
      providers: [RuleRepositoryService]
    }).compile();

    ruleRepositoryService = moduleRef.get(RuleRepositoryService);
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Constraints", () => {
    it("CRUD", async () => {
      const constraintTemplate = {
        type: ConstraintType.ATOMIC,
        title: "Test Constraint",
        description: "Test constraint description",
        leftOperand: "dspace:vc",
        operator: "odrl:eq",
        contextPath: "$.verifiableCredentials[*]",
        dataType: DataType.STRING,
        evaluable: [
          EvaluationTrigger.PROVIDER_ON_REQUEST,
          EvaluationTrigger.PROVIDER_CONTINUOUS,
          EvaluationTrigger.PROVIDER_ON_EXECUTION,
          EvaluationTrigger.CONSUMER_ON_REQUEST,
          EvaluationTrigger.CONSUMER_CONTINUOUS,
          EvaluationTrigger.CONSUMER_ON_EXECUTION
        ]
      };
      expect(
        (
          await ruleRepositoryService.listConstraint(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(0);
      const constraint = AtomicConstraint.parse(constraintTemplate);
      await ruleRepositoryService.addConstraint(constraint);
      expect(
        (
          await ruleRepositoryService.listConstraint(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(1);
      constraint.id = undefined;
      await expect(
        ruleRepositoryService.addConstraint(constraint)
      ).rejects.toThrow("Could not add new constraint");
      const constraint2 = AtomicConstraint.parse({
        ...constraintTemplate,
        title: "Test Constraint 2",
        description: "Test constraint description 2",
        leftOperand: "dspace:vc2",
        evaluable: [
          EvaluationTrigger.PROVIDER_ON_REQUEST,
          EvaluationTrigger.PROVIDER_CONTINUOUS,
          EvaluationTrigger.PROVIDER_ON_EXECUTION
        ]
      });
      await ruleRepositoryService.addConstraint(constraint2);
      expect(
        (
          await ruleRepositoryService.listConstraint(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(2);

      const constraints = await ruleRepositoryService.listConstraint(
        PaginationOptionsDto.NO_PAGINATION,
        true
      );
      const constraintDtos = await ruleRepositoryService.listConstraint(
        PaginationOptionsDto.NO_PAGINATION,
        false
      );

      expect(constraints[0]).toMatchObject({
        type: ConstraintType.ATOMIC,
        title: "Test Constraint",
        contextPath: "$.verifiableCredentials[*]",
        description: "Test constraint description",
        evaluable: [
          "PROVIDER_ON_REQUEST",
          "PROVIDER_CONTINUOUS",
          "PROVIDER_ON_EXECUTION",
          "CONSUMER_ON_REQUEST",
          "CONSUMER_CONTINUOUS",
          "CONSUMER_ON_EXECUTION"
        ],
        leftOperand: "dspace:vc"
      });
      expect(constraintDtos.data[0]).toMatchObject({
        title: "Test Constraint",
        contextPath: "$.verifiableCredentials[*]",
        description: "Test constraint description",
        evaluable: [
          "PROVIDER_ON_REQUEST",
          "PROVIDER_CONTINUOUS",
          "PROVIDER_ON_EXECUTION",
          "CONSUMER_ON_REQUEST",
          "CONSUMER_CONTINUOUS",
          "CONSUMER_ON_EXECUTION"
        ],
        leftOperand: "dspace:vc"
      });
      expect(await ruleRepositoryService.getConstraint(1)).toBeInstanceOf(
        AtomicConstraint
      );
      expect(await ruleRepositoryService.getConstraint(1, true)).toBeInstanceOf(
        ConstraintDao
      );
      await expect(ruleRepositoryService.getConstraint(3)).rejects.toThrow(
        "Could not find constraint"
      );
      await ruleRepositoryService.addConstraint(
        AtomicConstraint.parse({ ...constraintTemplate, leftOperand: "test" })
      );

      expect(
        (
          await ruleRepositoryService.listConstraint(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(3);
      await ruleRepositoryService.deleteConstraint(3);

      expect(
        (
          await ruleRepositoryService.listConstraint(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(2);
    });
    it("ODRL", async () => {
      const constraint = await ruleRepositoryService.getConstraintByOdrl({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "dspace:vc",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "tsg:MembershipCredential"
      });
      expect(constraint).toBeDefined();
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "dspace:vc",
          "odrl:operator": "odrl:eq",
          "odrl:rightOperandReference": "tsg:MembershipCredential"
        })
      ).toBeDefined();
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "dspace:vc",
          "odrl:operator": "odrl:unknown",
          "odrl:rightOperand": ""
        })
      ).toBeUndefined();
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "dspace:unknown",
          "odrl:operator": "odrl:eq",
          "odrl:rightOperand": ""
        })
      ).toBeUndefined();
      await expect(
        ruleRepositoryService.getConstraintByOdrl(
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "dspace:vc",
            "odrl:operator": "odrl:unknown",
            "odrl:rightOperand": ""
          },
          true
        )
      ).rejects.toThrow("Could not find constraint");
      await expect(
        ruleRepositoryService.getConstraintByOdrl(
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "dspace:unknown",
            "odrl:operator": "odrl:eq",
            "odrl:rightOperand": ""
          },
          true
        )
      ).rejects.toThrow("Could not find constraint");

      expect(ruleRepositoryService.constraintToOdrl(constraint!)).toEqual({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "dspace:vc",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "tsg:MembershipCredential"
      });
      expect(
        ruleRepositoryService.constraintToOdrl(
          constraint!,
          "tsg:MembershipCredential2"
        )
      ).toEqual({
        "@type": "odrl:Constraint",
        "odrl:leftOperand": "dspace:vc",
        "odrl:operator": "odrl:eq",
        "odrl:rightOperand": "tsg:MembershipCredential2"
      });
      expect(() =>
        ruleRepositoryService.constraintToOdrl(
          LogicalConstraint.parse({
            type: ConstraintType.LOGICAL,
            logicalOperator: "or",
            title: "Test logical operator="
          })
        )
      ).toThrow("not yet supported");

      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "dspace:vc",
          "odrl:operator": "odrl:eq",
          "odrl:rightOperand": {
            "@id": "tsg:MembershipCredential"
          }
        })
      ).toMatchObject({
        value: "tsg:MembershipCredential"
      });
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "dspace:vc",
          "odrl:operator": "odrl:eq",
          "odrl:rightOperand": {
            "@value": "tsg:MembershipCredential",
            "@type": "xsd:anyURI"
          }
        })
      ).toMatchObject({
        value: "tsg:MembershipCredential"
      });
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "dspace:vc",
          "odrl:operator": "odrl:eq"
        })
      ).toMatchObject({
        value: undefined
      });
    });
  });

  describe("Rules", () => {
    it("CRUD", async () => {
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(0);
      await ruleRepositoryService.addRule(
        Rule.parse({
          action: ["odrl:use"],
          assignee: ["did:web:localhost"],
          constraints: [await ruleRepositoryService.getConstraint(1)]
        })
      );
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(1);
      expect(await ruleRepositoryService.getRule(1)).toBeDefined();
      await expect(ruleRepositoryService.getRule(2)).rejects.toThrow(
        "Could not find rule"
      );
      expect(await ruleRepositoryService.getRule(1, false)).toBeInstanceOf(
        Rule
      );
      expect(await ruleRepositoryService.getRule(1, true)).toBeInstanceOf(
        RuleDao
      );
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION,
            true
          )
        )[0]
      ).toBeInstanceOf(RuleDao);

      await ruleRepositoryService.addRule(
        Rule.parse({
          action: ["odrl:use"],
          assignee: ["did:web:remote.com"],
          constraints: [await ruleRepositoryService.getConstraint(1)]
        })
      );
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(2);
      await ruleRepositoryService.deleteRule(2);

      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(1);
    });
    it("ODRL", async () => {
      const rule = await ruleRepositoryService.getRule(1);
      (rule.constraints[0] as AtomicConstraint).value =
        "tsg:MembershipCredential";
      expect(
        ruleRepositoryService.ruleToOdrl(
          rule,
          RuleType.DUTY,
          "urn:uuid:897330e2-f317-49c9-902f-e66451355f7e"
        )
      ).toEqual({
        "@type": "odrl:Duty",
        "odrl:action": ["odrl:use"],
        "odrl:assignee": ["did:web:localhost"],
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "dspace:vc",
            "odrl:operator": "odrl:eq",
            "odrl:rightOperand": "tsg:MembershipCredential"
          }
        ],
        "odrl:target": "urn:uuid:897330e2-f317-49c9-902f-e66451355f7e"
      });
      expect(
        ruleRepositoryService.ruleToOdrl(rule, RuleType.PROHIBITION)
      ).toEqual({
        "@type": "odrl:Prohibition",
        "odrl:action": ["odrl:use"],
        "odrl:assignee": ["did:web:localhost"],
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "dspace:vc",
            "odrl:operator": "odrl:eq",
            "odrl:rightOperand": "tsg:MembershipCredential"
          }
        ],
        "odrl:target": undefined
      });
      expect(
        ruleRepositoryService.ruleToOdrl(
          { ...rule, duties: [{ ...rule, type: RuleType.DUTY }] },
          RuleType.PERMISSION
        )
      ).toEqual({
        "@type": "odrl:Permission",
        "odrl:action": ["odrl:use"],
        "odrl:assignee": ["did:web:localhost"],
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:leftOperand": "dspace:vc",
            "odrl:operator": "odrl:eq",
            "odrl:rightOperand": "tsg:MembershipCredential"
          }
        ],
        "odrl:target": undefined,
        "odrl:duty": [
          {
            "@type": "odrl:Duty",
            "odrl:action": ["odrl:use"],
            "odrl:assignee": ["did:web:localhost"],
            "odrl:constraint": [
              {
                "@type": "odrl:Constraint",
                "odrl:leftOperand": "dspace:vc",
                "odrl:operator": "odrl:eq",
                "odrl:rightOperand": "tsg:MembershipCredential"
              }
            ],
            "odrl:target": undefined
          }
        ]
      });
      expect(() => ruleRepositoryService.ruleToOdrl(rule)).toThrow(
        "Type required for rule to ODRL conversion"
      );
    });
  });
});
