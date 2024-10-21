import { HttpStatus, Injectable } from "@nestjs/common";
import { ConstraintDao, RuleDao } from "../model/rule.dao";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Rule, RuleType } from "./rule.dto";
import { DSPError } from "../utils/errors/error";
import {
  Agreement,
  AgreementDto,
  ConstraintDto,
  DutyDto,
  ODRLOperator,
  PermissionDto,
  ProhibitionDto,
  ValueDto,
} from "@tsg-dsp/common-dsp";
import { toCompactUri } from "../utils/contexts";
import {
  AtomicConstraint,
  ConstraintModel,
  ConstraintType,
  DataType,
  EvaluationTrigger,
} from "./constraint.dto";

@Injectable()
export class RuleRepositoryService {
  constructor(
    @InjectRepository(RuleDao)
    readonly ruleRepository: Repository<RuleDao>,
    @InjectRepository(ConstraintDao)
    readonly constraintRepository: Repository<ConstraintDao>
  ) {
    setTimeout(this.insertInitialConstraints.bind(this), 2000);
  }

  async insertInitialConstraints() {
    if ((await this.constraintRepository.count()) === 0) {
      await this.constraintRepository.insert([
        {
          id: 0,
          type: ConstraintType.ATOMIC,
          title: "Verifiable Presentation Input Descriptor",
          description:
            "Matches an input descriptor following the DIF Presentation Definition to a presented Verifiable Presentation",
          leftOperand: "tsg:vpInputDescriptor",
          operator: ODRLOperator.IS_ANY_OF,
          contextPath: "$.verifiableCredentials[:]",
          evaluable: [
            EvaluationTrigger.PROVIDER_ON_REQUEST,
            EvaluationTrigger.PROVIDER_CONTINUOUS,
            EvaluationTrigger.PROVIDER_ON_EXECUTION,
          ],
          dataType: DataType.DIF_INPUT_DESCRIPTOR,
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
            EvaluationTrigger.CONSUMER_ON_EXECUTION,
          ],
          dataType: DataType.DATETIME,
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
            EvaluationTrigger.CONSUMER_ON_EXECUTION,
          ],
          dataType: DataType.STRING,
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
          dataType: DataType.NUMBER,
        },
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
        constraints: { constraints: { constraints: { constraints: true } } },
      },
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
    const leftOperand = toCompactUri(constraintDto["odrl:leftOperand"]);
    const operator = toCompactUri(constraintDto["odrl:operator"]);
    const constraintDao = await this.constraintRepository.findOneBy({
      leftOperand: leftOperand,
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
      constraintDto["odrl:rightOperand"] ??
        constraintDto["odrl:rightOperandReference"]
    );
    return constraint;
  }

  constraintToOdrl(constraint: ConstraintModel, value?: string): ConstraintDto {
    if (constraint instanceof AtomicConstraint) {
      return {
        "@type": "odrl:Constraint",
        "odrl:leftOperand": toCompactUri(constraint.leftOperand),
        "odrl:operator": constraint.operator,
        "odrl:rightOperand": value ?? constraint.value,
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

  async listConstraint(): Promise<ConstraintModel[]>;
  async listConstraint(dao: false): Promise<ConstraintModel[]>;
  async listConstraint(dao: true): Promise<ConstraintDao[]>;
  async listConstraint(
    dao: boolean = false
  ): Promise<ConstraintDao[] | ConstraintModel[]> {
    const constraints = await this.constraintRepository.find({
      relations: {
        constraints: { constraints: { constraints: { constraints: true } } },
      },
    });
    if (dao) {
      return constraints;
    } else {
      return ConstraintModel.parse(constraints);
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
        duties: { constraints: { constraints: { constraints: true } } },
      },
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

  async listRule(): Promise<Rule[]>;
  async listRule(dao: false): Promise<Rule[]>;
  async listRule(dao: true): Promise<RuleDao[]>;
  async listRule(dao: boolean = false): Promise<RuleDao[] | Rule[]> {
    const rules = await this.ruleRepository.find({
      relations: {
        constraints: { constraints: { constraints: { constraints: true } } },
        duties: { constraints: { constraints: { constraints: true } } },
      },
    });
    if (!dao) {
      return Rule.parse(rules);
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
          "@type": "odrl:Prohibition",
          "odrl:action": rule.action,
          "odrl:target": ruleTarget,
          "odrl:assignee": rule.assignee,
          "odrl:constraint": rule.constraints.map((constraint) =>
            this.constraintToOdrl(constraint)
          ),
        };
      case RuleType.DUTY:
        return {
          "@type": "odrl:Duty",
          "odrl:action": rule.action,
          "odrl:target": ruleTarget,
          "odrl:assignee": rule.assignee,
          "odrl:constraint": rule.constraints.map((constraint) =>
            this.constraintToOdrl(constraint)
          ),
        };
      case RuleType.PERMISSION:
        return {
          "@type": "odrl:Permission",
          "odrl:action": rule.action,
          "odrl:target": ruleTarget,
          "odrl:assignee": rule.assignee,
          "odrl:constraint": rule.constraints.map((constraint) =>
            this.constraintToOdrl(constraint)
          ),
          "odrl:duty": rule.duties.map(
            (constraint) => this.ruleToOdrl(constraint) as DutyDto
          ),
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
