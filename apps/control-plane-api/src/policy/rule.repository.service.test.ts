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

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Constraints", () => {
    it("CRUD", async () => {
      const constraintTemplate = {
        type: ConstraintType.ATOMIC,
        title: "Test Constraint",
        description: "Test constraint description",
        leftOperand: "dspace:vc",
        operator: "eq",
        contextPath: "$.verifiableCredentials[*].credential",
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

      expect(constraints[1]).toMatchObject({
        type: ConstraintType.ATOMIC,
        title: "Test Constraint",
        contextPath: "$.verifiableCredentials[*].credential",
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
      expect(constraintDtos.data[1]).toMatchObject({
        title: "Test Constraint",
        contextPath: "$.verifiableCredentials[*].credential",
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

      expect(
        await ruleRepositoryService.getConstraint(constraints[1].id)
      ).toBeInstanceOf(AtomicConstraint);
      expect(
        await ruleRepositoryService.getConstraint(constraints[0].id, true)
      ).toBeInstanceOf(ConstraintDao);
      await expect(
        ruleRepositoryService.getConstraint("unknown")
      ).rejects.toThrow("Could not find constraint");
      await ruleRepositoryService.addConstraint(
        AtomicConstraint.parse({
          ...constraintTemplate,
          id: "fixed-test",
          leftOperand: "test"
        })
      );

      expect(
        (
          await ruleRepositoryService.listConstraint(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(3);
      await ruleRepositoryService.deleteConstraint("fixed-test");

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
        "@type": "Constraint",
        leftOperand: "dspace:vc",
        operator: "eq",
        rightOperand: "tsg:MembershipCredential"
      });
      expect(constraint).toBeDefined();
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "Constraint",
          leftOperand: "dspace:vc",
          operator: "eq",
          rightOperandReference: "tsg:MembershipCredential"
        })
      ).toBeDefined();
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "Constraint",
          leftOperand: "dspace:vc",
          operator: "unknown",
          rightOperand: ""
        })
      ).toBeUndefined();
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "Constraint",
          leftOperand: "dspace:unknown",
          operator: "eq",
          rightOperand: ""
        })
      ).toBeUndefined();
      await expect(
        ruleRepositoryService.getConstraintByOdrl(
          {
            "@type": "Constraint",
            leftOperand: "dspace:vc",
            operator: "unknown",
            rightOperand: ""
          },
          true
        )
      ).rejects.toThrow("Could not find constraint");
      await expect(
        ruleRepositoryService.getConstraintByOdrl(
          {
            "@type": "Constraint",
            leftOperand: "dspace:unknown",
            operator: "eq",
            rightOperand: ""
          },
          true
        )
      ).rejects.toThrow("Could not find constraint");

      expect(ruleRepositoryService.constraintToOdrl(constraint!)).toEqual({
        "@type": "Constraint",
        leftOperand: "dspace:vc",
        operator: "eq",
        rightOperand: "tsg:MembershipCredential"
      });
      expect(
        ruleRepositoryService.constraintToOdrl(
          constraint!,
          "tsg:MembershipCredential2"
        )
      ).toEqual({
        "@type": "Constraint",
        leftOperand: "dspace:vc",
        operator: "eq",
        rightOperand: "tsg:MembershipCredential2"
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
          "@type": "Constraint",
          leftOperand: "dspace:vc",
          operator: "eq",
          rightOperand: {
            "@id": "tsg:MembershipCredential"
          }
        })
      ).toMatchObject({
        value: "tsg:MembershipCredential"
      });
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "Constraint",
          leftOperand: "dspace:vc",
          operator: "eq",
          rightOperand: {
            "@value": "tsg:MembershipCredential",
            "@type": "xsd:anyURI"
          }
        })
      ).toMatchObject({
        value: "tsg:MembershipCredential"
      });
      expect(
        await ruleRepositoryService.getConstraintByOdrl({
          "@type": "Constraint",
          leftOperand: "dspace:vc",
          operator: "eq"
        })
      ).toMatchObject({
        value: undefined
      });
    });
  });

  describe("Rules", () => {
    it("CRUD", async () => {
      const constraints = await ruleRepositoryService.listConstraint(
        PaginationOptionsDto.NO_PAGINATION,
        true
      );
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(0);
      const rule1 = await ruleRepositoryService.addRule(
        Rule.parse({
          action: ["use"],
          assignee: ["did:web:localhost"],
          constraints: [constraints[0]]
        })
      );
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(1);
      expect(await ruleRepositoryService.getRule(rule1.id!)).toBeDefined();
      await expect(ruleRepositoryService.getRule("unknown")).rejects.toThrow(
        "Could not find rule"
      );
      expect(
        await ruleRepositoryService.getRule(rule1.id!, false)
      ).toBeInstanceOf(Rule);
      expect(
        await ruleRepositoryService.getRule(rule1.id!, true)
      ).toBeInstanceOf(RuleDao);
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION,
            true
          )
        )[0]
      ).toBeInstanceOf(RuleDao);

      const rule2 = await ruleRepositoryService.addRule(
        Rule.parse({
          action: ["use"],
          assignee: ["did:web:remote.com"],
          constraints: [constraints[0]]
        })
      );
      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(2);
      await ruleRepositoryService.deleteRule(rule2.id!);

      expect(
        (
          await ruleRepositoryService.listRule(
            PaginationOptionsDto.NO_PAGINATION
          )
        ).total
      ).toBe(1);
    });
    it("ODRL", async () => {
      const rules = await ruleRepositoryService.listRule(
        PaginationOptionsDto.NO_PAGINATION
      );
      const rule = rules.data[0];
      (rule.constraints[0] as AtomicConstraint).value =
        "tsg:MembershipCredential";
      expect(
        ruleRepositoryService.ruleToOdrl(
          rule,
          RuleType.DUTY,
          "urn:uuid:897330e2-f317-49c9-902f-e66451355f7e"
        )
      ).toEqual({
        "@type": "Duty",
        action: ["use"],
        assignee: ["did:web:localhost"],
        constraint: [
          {
            "@type": "Constraint",
            leftOperand: "dspace:vc2",
            operator: "eq",
            rightOperand: "tsg:MembershipCredential"
          }
        ],
        target: "urn:uuid:897330e2-f317-49c9-902f-e66451355f7e"
      });
      expect(
        ruleRepositoryService.ruleToOdrl(rule, RuleType.PROHIBITION)
      ).toEqual({
        "@type": "Prohibition",
        action: ["use"],
        assignee: ["did:web:localhost"],
        constraint: [
          {
            "@type": "Constraint",
            leftOperand: "dspace:vc2",
            operator: "eq",
            rightOperand: "tsg:MembershipCredential"
          }
        ],
        target: undefined
      });
      expect(
        ruleRepositoryService.ruleToOdrl(
          { ...rule, duties: [{ ...rule, type: RuleType.DUTY }] },
          RuleType.PERMISSION
        )
      ).toEqual({
        "@type": "Permission",
        action: ["use"],
        assignee: ["did:web:localhost"],
        constraint: [
          {
            "@type": "Constraint",
            leftOperand: "dspace:vc2",
            operator: "eq",
            rightOperand: "tsg:MembershipCredential"
          }
        ],
        target: undefined,
        duty: [
          {
            "@type": "Duty",
            action: ["use"],
            assignee: ["did:web:localhost"],
            constraint: [
              {
                "@type": "Constraint",
                leftOperand: "dspace:vc2",
                operator: "eq",
                rightOperand: "tsg:MembershipCredential"
              }
            ],
            target: undefined
          }
        ]
      });
      expect(() => ruleRepositoryService.ruleToOdrl(rule)).toThrow(
        "Type required for rule to ODRL conversion"
      );
    });
  });
});
