import { HttpStatus, Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paginated, PaginationOptionsDto } from "@tsg-dsp/common-api";
import {
  ConstraintDto,
  DutyDto,
  ODRLOperator,
  PermissionDto,
  ProhibitionDto,
  ValueDto
} from "@tsg-dsp/common-dsp";
import { Repository } from "typeorm";

import { ConstraintDao, RuleDao } from "../model/rule.dao.js";
import { toCompactUri } from "../utils/contexts.js";
import { DSPError } from "../utils/errors/error.js";
import {
  AtomicConstraint,
  ConstraintModel,
  ConstraintType,
  DataType,
  EvaluationTrigger
} from "./constraint.dto.js";
import { Rule, RuleType } from "./rule.dto.js";

@Injectable()
export class RuleRepositoryService implements OnModuleInit {
  constructor(
    @InjectRepository(RuleDao)
    readonly ruleRepository: Repository<RuleDao>,
    @InjectRepository(ConstraintDao)
    readonly constraintRepository: Repository<ConstraintDao>
  ) {}

  async onModuleInit() {
    await this.insertInitialConstraints();
  }

  async insertInitialConstraints() {
    if ((await this.constraintRepository.count()) === 0) {
      await this.constraintRepository.insert([
        {
          id: 0,
          type: ConstraintType.ATOMIC,
          title: "Presentation scope",
          description:
            "Matches a presentation scope to a presented Verifiable Presentation",
          leftOperand: "tsg:presentationScope",
          operator: ODRLOperator.EQ,
          contextPath: "$.verifiableCredentials[:].scope",
          evaluable: [
            EvaluationTrigger.PROVIDER_ON_REQUEST,
            EvaluationTrigger.PROVIDER_CONTINUOUS,
            EvaluationTrigger.PROVIDER_ON_EXECUTION
          ],
          dataType: DataType.STRING
        },
        {
          id: 1,
          type: ConstraintType.ATOMIC,
          title: "Evaluation time",
          description: "Current time at moment of evaluation",
          leftOperand: "tsg:evaluationTime",
          operator: undefined,
          contextPath: "$.evaluationTime",
          evaluable: [
            EvaluationTrigger.PROVIDER_ON_REQUEST,
            EvaluationTrigger.PROVIDER_CONTINUOUS,
            EvaluationTrigger.PROVIDER_ON_REQUEST,
            EvaluationTrigger.PROVIDER_ON_EXECUTION,
            EvaluationTrigger.CONSUMER_CONTINUOUS,
            EvaluationTrigger.CONSUMER_ON_EXECUTION
          ],
          dataType: DataType.DATETIME
        },
        {
          id: 2,
          type: ConstraintType.ATOMIC,
          title: "Signature Status",
          description: "Status of signature verification of the agreement",
          leftOperand: "tsg:signatureStatus",
          operator: ODRLOperator.EQ,
          contextPath: "$.policy.signatureStatus",
          evaluable: [
            EvaluationTrigger.PROVIDER_ON_REQUEST,
            EvaluationTrigger.PROVIDER_CONTINUOUS,
            EvaluationTrigger.PROVIDER_ON_EXECUTION,
            EvaluationTrigger.CONSUMER_ON_REQUEST,
            EvaluationTrigger.CONSUMER_CONTINUOUS,
            EvaluationTrigger.CONSUMER_ON_EXECUTION
          ],
          dataType: DataType.STRING
        },
        {
          id: 3,
          type: ConstraintType.ATOMIC,
          title: "Minimal set size",
          description: "Status of signature verification of the agreement",
          leftOperand: "tsg:minSetSize",
          operator: ODRLOperator.EQ,
          contextPath: "$.transfer.setSize",
          evaluable: [EvaluationTrigger.PROVIDER_ON_EXECUTION],
          dataType: DataType.NUMBER
        }
      ]);
    }
  }

  async getConstraint(id: number): Promise<ConstraintModel>;
  async getConstraint(id: number, dao: false): Promise<ConstraintModel>;
  async getConstraint(id: number, dao: true): Promise<ConstraintDao>;
  async getConstraint(
    id: number,
    dao: boolean = false
  ): Promise<ConstraintDao | ConstraintModel> {
    const constraint = await this.constraintRepository.findOne({
      where: { id },
      relations: {
        constraints: { constraints: { constraints: { constraints: true } } }
      }
    });
    if (!constraint) {
      throw new DSPError(
        `Could not find constraint with id ${id}`,
        HttpStatus.NOT_FOUND
      );
    }
    if (!dao) {
      return ConstraintModel.parse(constraint);
    }
    return constraint;
  }

  async getConstraintByOdrl(
    constraintDto: ConstraintDto
  ): Promise<ConstraintModel | undefined>;
  async getConstraintByOdrl(
    constraintDto: ConstraintDto,
    shouldThrow: false
  ): Promise<ConstraintModel | undefined>;
  async getConstraintByOdrl(
    constraintDto: ConstraintDto,
    shouldThrow: true
  ): Promise<ConstraintModel>;
  async getConstraintByOdrl(
    constraintDto: ConstraintDto,
    shouldThrow: boolean = false
  ): Promise<ConstraintModel | undefined> {
    const leftOperand = toCompactUri(constraintDto.leftOperand);
    const operator = toCompactUri(constraintDto.operator);
    const constraintDao = await this.constraintRepository.findOneBy({
      leftOperand: leftOperand
    });
    if (!constraintDao) {
      if (shouldThrow) {
        throw new DSPError(
          `Could not find constraint based on ODRL`,
          HttpStatus.NOT_FOUND
        );
      }
      return undefined;
    }
    if (
      constraintDao.operator != undefined &&
      constraintDao.operator != operator
    ) {
      if (shouldThrow) {
        throw new DSPError(
          `Could not find constraint based on ODRL with specific operator`,
          HttpStatus.NOT_FOUND
        );
      }
      return undefined;
    }
    const constraint = AtomicConstraint.parse(constraintDao);
    constraint.value = RuleRepositoryService.parseRightOperand(
      constraintDto.rightOperand ?? constraintDto.rightOperandReference
    );
    return constraint;
  }

  constraintToOdrl(constraint: ConstraintModel, value?: string): ConstraintDto {
    if (constraint instanceof AtomicConstraint) {
      return {
        "@type": "Constraint",
        leftOperand: toCompactUri(constraint.leftOperand),
        operator: constraint.operator,
        rightOperand: value ?? constraint.value
      };
    }
    throw new DSPError(
      `Translating of logical constraints is not yet supported`,
      HttpStatus.NOT_IMPLEMENTED
    );
  }

  static parseRightOperand(
    rightOperand: ValueDto | string | undefined
  ): string | undefined {
    if (typeof rightOperand === "string") {
      return rightOperand;
    } else if (typeof rightOperand === "object") {
      if ("@value" in rightOperand) {
        return rightOperand["@value"];
      } else if ("@id" in rightOperand) {
        return rightOperand["@id"];
      }
    }
    return undefined;
  }

  async listConstraint(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<ConstraintModel[]>>;
  async listConstraint(
    paginationOptions: PaginationOptionsDto,
    dao: false
  ): Promise<Paginated<ConstraintModel[]>>;
  async listConstraint(
    paginationOptions: PaginationOptionsDto,
    dao: true
  ): Promise<ConstraintDao[]>;
  async listConstraint(
    paginationOptions: PaginationOptionsDto,
    dao: boolean = false
  ): Promise<ConstraintDao[] | Paginated<ConstraintModel[]>> {
    const [constraints, itemCount] =
      await this.constraintRepository.findAndCount({
        relations: {
          constraints: { constraints: { constraints: { constraints: true } } }
        },
        take: paginationOptions.take,
        skip: paginationOptions.skip,
        order: {
          [paginationOptions.order_by]: paginationOptions.order
        }
      });
    if (dao) {
      return constraints;
    } else {
      return {
        data: ConstraintModel.parse(constraints),
        total: itemCount
      };
    }
  }

  async addConstraint(constraint: ConstraintModel) {
    try {
      await this.constraintRepository.save(constraint);
    } catch (e) {
      throw new DSPError(
        `Could not add new constraint`,
        HttpStatus.CONFLICT,
        e
      );
    }
  }

  async deleteConstraint(id: number) {
    const constraint = await this.getConstraint(id, true);
    await this.constraintRepository.remove(constraint);
  }

  async getRule(id: number): Promise<Rule>;
  async getRule(id: number, dao: false): Promise<Rule>;
  async getRule(id: number, dao: true): Promise<RuleDao>;
  async getRule(id: number, dao: boolean = false): Promise<RuleDao | Rule> {
    const rule = await this.ruleRepository.findOne({
      where: { id },
      relations: {
        constraints: { constraints: { constraints: { constraints: true } } },
        duties: { constraints: { constraints: { constraints: true } } }
      }
    });
    if (!rule) {
      throw new DSPError(
        `Could not find rule with id ${id}`,
        HttpStatus.NOT_FOUND
      );
    }
    if (!dao) {
      return Rule.parse(rule);
    }
    return rule;
  }

  async listRule(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<Rule[]>>;
  async listRule(
    paginationOptions: PaginationOptionsDto,
    dao: false
  ): Promise<Paginated<Rule[]>>;
  async listRule(
    paginationOptions: PaginationOptionsDto,
    dao: true
  ): Promise<RuleDao[]>;
  async listRule(
    paginationOptions: PaginationOptionsDto,
    dao: boolean = false
  ): Promise<RuleDao[] | Paginated<Rule[]>> {
    const [rules, itemCount] = await this.ruleRepository.findAndCount({
      relations: {
        constraints: { constraints: { constraints: { constraints: true } } },
        duties: { constraints: { constraints: { constraints: true } } }
      },
      skip: paginationOptions.skip,
      take: paginationOptions.take,
      order: {
        [paginationOptions.order_by]: paginationOptions.order
      }
    });
    if (!dao) {
      return {
        data: Rule.parse(rules),
        total: itemCount
      };
    }
    return rules;
  }

  ruleToOdrl(
    rule: Rule,
    type?: RuleType,
    target?: string
  ): PermissionDto | ProhibitionDto | DutyDto {
    const ruleType = type ?? rule.type;
    const ruleTarget = target ?? rule.target;

    switch (ruleType) {
      case RuleType.PROHIBITION:
        return {
          "@type": "Prohibition",
          action: rule.action,
          target: ruleTarget,
          assignee: rule.assignee,
          constraint: rule.constraints.map((constraint) =>
            this.constraintToOdrl(constraint)
          )
        };
      case RuleType.DUTY:
        return {
          "@type": "Duty",
          action: rule.action,
          target: ruleTarget,
          assignee: rule.assignee,
          constraint: rule.constraints.map((constraint) =>
            this.constraintToOdrl(constraint)
          )
        };
      case RuleType.PERMISSION:
        return {
          "@type": "Permission",
          action: rule.action,
          target: ruleTarget,
          assignee: rule.assignee,
          constraint: rule.constraints.map((constraint) =>
            this.constraintToOdrl(constraint)
          ),
          duty: rule.duties.map(
            (constraint) => this.ruleToOdrl(constraint) as DutyDto
          )
        };
      default:
        throw new DSPError(
          `Type required for rule to ODRL conversion`,
          HttpStatus.BAD_REQUEST
        );
    }
  }

  async addRule(rule: Rule) {
    await this.ruleRepository.save(rule);
  }

  async deleteRule(id: number) {
    const rule = await this.getRule(id, true);
    await this.ruleRepository.remove(rule);
  }
}
