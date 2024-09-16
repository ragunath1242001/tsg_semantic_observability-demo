import { HttpStatus, Logger } from "@nestjs/common";
import {
  PermissionDto,
  ProhibitionDto,
  DutyDto,
  ConstraintDto,
  ODRLOperator,
  toArray,
} from "@tsg-dsp/common-dsp";
import jsonpath from "jsonpath";
import { DSPError } from "../utils/errors/error";
import { RuleRepositoryService } from "./rule.repository.service";
import { AtomicConstraint, DataType } from "./constraint.dto";
import {
  EvaluationContext,
  EvaluationDecision,
  EvaluationResult,
} from "./evaluation.dto";
import { Field, InputDescriptor } from "@tsg-dsp/common-dtos";
import { Ajv } from "ajv";

export const promiseMap = async <T, U>(
  array: T[] | undefined,
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
  thisArg?: any
): Promise<U[]> => {
  if (!array) return [];
  const promises = await Promise.allSettled(array.map(callbackfn));
  if (promises.some((p) => p.status === "rejected")) {
    throw new DSPError(
      `Error in executing promises: ${promises
        .filter((p) => p.status === "rejected")
        .map((p) => p.reason.message)
        .join(" | ")}`,
      HttpStatus.OK,
      promises.filter((p) => p.status === "rejected").map((p) => p.reason)
    );
  }
  return promises.map((p) => (p as PromiseFulfilledResult<U>).value);
};

export class Evaluation {
  constructor(
    private readonly context: EvaluationContext,
    private readonly ruleRepositoryService: RuleRepositoryService
  ) {
    context.evaluationTime = new Date();
  }
  private readonly logger = new Logger(this.constructor.name);
  //@ts-expect-error ajv error
  private readonly ajv = new Ajv.default();

  async evaluate(): Promise<EvaluationDecision> {
    this.logger.debug(`Evaluating:\n${JSON.stringify(this.context, null, 2)}`);
    if (this.context.policy.agreement["odrl:target"] !== this.context.target) {
      this.logger.warn(
        `Target mismatch, context has target ${this.context.target} while agreement has target ${this.context.policy.agreement["odrl:target"]}`
      );
      return {
        decision: "DENY",
        reason: `Target mismatch, context has target ${this.context.target} while agreement has target ${this.context.policy.agreement["odrl:target"]}`,
        context: this.context,
      };
    }
    let expectedAssigner;
    let expectedAssignee;
    switch (this.context.role) {
      case "provider":
        expectedAssigner = this.context.localParticipant;
        expectedAssignee = this.context.remoteParticipant;
        break;
      case "consumer":
        expectedAssigner = this.context.remoteParticipant;
        expectedAssignee = this.context.localParticipant;
    }
    if (this.context.policy.agreement["odrl:assigner"] !== expectedAssigner) {
      this.logger.warn(
        `Assigner of the agreement does not match the expected participant (${this.context.policy.agreement["odrl:assigner"]} vs. ${expectedAssigner})`
      );
      return {
        decision: "DENY",
        reason: `Assigner of the agreement does not match the expected participant (${this.context.policy.agreement["odrl:assigner"]} vs. ${expectedAssigner})`,
        context: this.context,
      };
    }
    if (this.context.policy.agreement["odrl:assignee"] !== expectedAssignee) {
      this.logger.warn(
        `Assignee of the agreement does not match the expected participant (${this.context.policy.agreement["odrl:assignee"]} vs. ${expectedAssignee})`
      );
      return {
        decision: "DENY",
        reason: `Assignee of the agreement does not match the expected participant (${this.context.policy.agreement["odrl:assignee"]} vs. ${expectedAssignee})`,
        context: this.context,
      };
    }
    const permissions = await promiseMap(
      this.context.policy.agreement["odrl:permission"],
      (rule) => this.evaluateRule(rule)
    );
    const prohibitions = await promiseMap(
      this.context.policy.agreement["odrl:prohibition"],
      (rule) => this.evaluateRule(rule)
    );
    const obligations = await promiseMap(
      this.context.policy.agreement["odrl:obligation"],
      (rule) => this.evaluateRule(rule)
    );

    if (prohibitions.includes(EvaluationResult.VALID)) {
      this.logger.warn(`One of the prohibitions matched: ${prohibitions}`);
      return EvaluationDecision.parse({
        decision: "DENY",
        reason: `One of the prohibitions matched`,
        permissions: permissions,
        prohibitions: prohibitions,
        obligations: obligations,
        context: this.context,
      });
    }
    if (prohibitions.includes(EvaluationResult.INDECISIVE)) {
      this.logger.warn(
        `One of the prohibitions could not be evaluated properly: ${prohibitions}`
      );
      return EvaluationDecision.parse({
        decision: "DENY",
        reason: `One of the prohibitions could not be evaluated properly`,
        permissions: permissions,
        prohibitions: prohibitions,
        obligations: obligations,
        context: this.context,
      });
    }
    if (permissions.includes(EvaluationResult.VALID)) {
      this.logger.debug(`Evaluation successful`);
      return EvaluationDecision.parse({
        decision: "ALLOW",
        permissions: permissions,
        prohibitions: prohibitions,
        obligations: obligations,
        context: this.context,
      });
    }
    if (permissions.includes(EvaluationResult.INDECISIVE)) {
      this.logger.warn(
        `One of the permissions could not be evaluated properly and no matching permissions found: ${permissions}`
      );
      return EvaluationDecision.parse({
        decision: "DENY",
        reason: `One of the permissions could not be evaluated properly and no matching permissions found`,
        permissions: permissions,
        prohibitions: prohibitions,
        obligations: obligations,
        context: this.context,
      });
    }
    const result = EvaluationDecision.parse({
      decision: "ALLOW",
      reason: `No rule could be matched and evaluated successfully`,
      permissions: permissions,
      prohibitions: prohibitions,
      obligations: obligations,
      context: this.context,
    });
    this.logger.debug(
      `No rule could be matched and evaluated successfully:\n${JSON.stringify(
        result,
        null,
        2
      )}`
    );
    return result;
  }

  private async evaluateRule(
    rule: PermissionDto | ProhibitionDto | DutyDto
  ): Promise<EvaluationResult> {
    if (rule["odrl:target"] && rule["odrl:target"] !== this.context.target) {
      this.logger.debug(
        `Target mismatch: ${rule["odrl:target"]} vs ${this.context.target}`
      );
      return EvaluationResult.NOT_APPLICABLE;
    }
    if (!toArray(rule["odrl:action"]).includes(this.context.action)) {
      this.logger.debug(
        `Action mismatch: ${rule["odrl:action"]} vs ${this.context.action}`
      );
      return EvaluationResult.NOT_APPLICABLE;
    }
    let expectedAssigner;
    let expectedAssignee;
    switch (this.context.role) {
      case "provider":
        expectedAssigner = this.context.localParticipant;
        expectedAssignee = this.context.remoteParticipant;
        break;
      case "consumer":
        expectedAssigner = this.context.remoteParticipant;
        expectedAssignee = this.context.localParticipant;
    }
    if (rule["odrl:assigner"] && rule["odrl:assigner"] !== expectedAssigner) {
      this.logger.debug(
        `Assigner mismatch: ${rule["odrl:assigner"]} vs ${expectedAssigner}`
      );
      return EvaluationResult.NOT_APPLICABLE;
    }
    if (
      rule["odrl:assignee"] &&
      toArray(rule["odrl:assignee"]).length > 0 &&
      !toArray(rule["odrl:assignee"]).includes(expectedAssignee)
    ) {
      this.logger.debug(
        `Assignee mismatch: ${rule["odrl:assignee"]} vs ${expectedAssignee}`
      );
      return EvaluationResult.NOT_APPLICABLE;
    }

    const constraints = await promiseMap(
      rule["odrl:constraint"],
      (constraint) => this.evaluateConstraint(constraint)
    );
    this.logger.debug(`Constraint results: ${constraints}`);
    const constraintResult = this.mapResults(constraints);
    if (rule["@type"] === "odrl:Permission") {
      const dutyResults = await promiseMap(rule["odrl:duty"], (rule) =>
        this.evaluateRule(rule)
      );
      const dutyResult =
        dutyResults.length === 0 ? [] : [this.mapResults(dutyResults)];
      return this.mapResults([constraintResult, ...dutyResult]);
    } else {
      return constraintResult;
    }
  }

  private mapResults(results: EvaluationResult[]): EvaluationResult {
    if (results.length === 0) {
      return EvaluationResult.VALID;
    }
    if (results.includes(EvaluationResult.INVALID)) {
      return EvaluationResult.INVALID;
    }
    if (results.includes(EvaluationResult.VALID)) {
      return EvaluationResult.VALID;
    }
    if (results.includes(EvaluationResult.INDECISIVE)) {
      return EvaluationResult.INDECISIVE;
    }
    return EvaluationResult.NOT_APPLICABLE;
  }

  private async evaluateConstraint(
    constraint: ConstraintDto
  ): Promise<EvaluationResult> {
    const constraintTemplate =
      (await this.ruleRepositoryService.getConstraintByOdrl(
        constraint
      )) as AtomicConstraint;
    if (!constraintTemplate) {
      this.logger.warn(
        `Could not find constraint template for: ${JSON.stringify(constraint)}`
      );
      return EvaluationResult.INVALID;
    }
    if (!constraintTemplate.evaluable.includes(this.context.scope)) {
      this.logger.debug(
        `Evaluation scope mismatch: ${constraintTemplate.evaluable} vs ${this.context.scope}`
      );
      return EvaluationResult.NOT_APPLICABLE;
    }
    const contextElements = jsonpath.query(
      this.context,
      constraintTemplate.contextPath
    );
    let result: EvaluationResult;
    switch (constraintTemplate.dataType ?? DataType.STRING) {
      case DataType.STRING:
      case DataType.URI:
        result = this.evaluateString(
          constraint["odrl:operator"],
          constraintTemplate.value!,
          contextElements
        );
        break;
      case DataType.NUMBER:
        result = this.evaluateNumber(
          constraint["odrl:operator"],
          Number(constraintTemplate.value),
          contextElements.map(Number)
        );
        break;
      case DataType.DATE:
        result = this.evaluateNumber(
          constraint["odrl:operator"],
          new Date(
            new Date(constraintTemplate.value!).toDateString()
          ).getTime(),
          contextElements.map((e) =>
            new Date(new Date(e).toDateString()).getTime()
          )
        );
        break;
      case DataType.DATETIME:
        result = this.evaluateNumber(
          constraint["odrl:operator"],
          new Date(constraintTemplate.value!).getTime(),
          contextElements.map((e) => new Date(e).getTime())
        );
        break;
      case DataType.DIF_INPUT_DESCRIPTOR:
        result = this.evaluateInputDescriptor(
          constraint["odrl:operator"],
          constraintTemplate.value!,
          contextElements
        );
        break;
    }
    if (result != EvaluationResult.VALID) {
      this.logger.debug(
        `Constraint evaluation: ${result} -> ${JSON.stringify(
          constraint
        )} & ${JSON.stringify(contextElements)}`
      );
    }
    return result;
  }

  private evaluateString(
    operator: string,
    rightOperand: string,
    context: any[]
  ) {
    switch (operator) {
      case ODRLOperator.EQ:
        if (context.length === 1 && context[0] === rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.NEQ:
        if (context.length === 1 && context[0] !== rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_ALL_OF:
        if (context.length > 0 && context.every((e) => e === rightOperand)) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_ANY_OF:
        if (context.some((e) => e === rightOperand)) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_NONE_OF:
        if (!context.some((e) => e === rightOperand)) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_PART_OF:
      case ODRLOperator.GTEQ:
      case ODRLOperator.HAS_PART:
      case ODRLOperator.IS_A:
      case ODRLOperator.GT:
      case ODRLOperator.LT:
      case ODRLOperator.LTEQ:
      default:
        return EvaluationResult.INDECISIVE;
    }
  }
  private evaluateNumber(
    operator: string,
    rightOperand: number,
    context: number[]
  ) {
    switch (operator) {
      case ODRLOperator.EQ:
        if (context.length === 1 && context[0] === rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.NEQ:
        if (context.length === 1 && context[0] !== rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_ALL_OF:
        if (context.length > 0 && context.every((e) => e === rightOperand)) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_ANY_OF:
        if (context.some((e) => e === rightOperand)) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.IS_NONE_OF:
        if (!context.some((e) => e === rightOperand)) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.GTEQ:
        if (context.length === 1 && context[0] >= rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.GT:
        if (context.length === 1 && context[0] > rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.LT:
        if (context.length === 1 && context[0] < rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.LTEQ:
        if (context.length === 1 && context[0] <= rightOperand) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      case ODRLOperator.HAS_PART:
      case ODRLOperator.IS_A:
      case ODRLOperator.IS_PART_OF:
      default:
        return EvaluationResult.INDECISIVE;
    }
  }

  private evaluateInputDescriptor(
    operator: string,
    rightOperand: string,
    context: any[]
  ) {
    const inputDescriptor: InputDescriptor = JSON.parse(rightOperand);
    switch (operator) {
      case ODRLOperator.IS_ANY_OF:
        if (context.some((e) => this.evaluateVC(e, inputDescriptor))) {
          return EvaluationResult.VALID;
        }
        return EvaluationResult.INVALID;
      default:
        return EvaluationResult.INDECISIVE;
    }
  }

  private evaluateVC(vc: any, inputDescriptor: InputDescriptor) {
    for (const fieldDescriptor of inputDescriptor.constraints.fields ?? []) {
      if (!this.evaluateField(vc, fieldDescriptor)) {
        return false;
      }
    }
    return true;
  }

  private evaluateField(vc: any, fieldDescriptor: Field) {
    let field: any | undefined = undefined;
    for (const path of fieldDescriptor.path) {
      const queryResult = jsonpath.query(vc, path, 1);
      if (queryResult[0]) {
        field = queryResult[0];
        break;
      }
    }
    if (fieldDescriptor.filter) {
      const validate = this.ajv.compile(fieldDescriptor.filter);
      if (Array.isArray(field) && fieldDescriptor.filter.type !== "array") {
        for (const item of field) {
          if (validate(item)) {
            return true;
          }
        }
      } else {
        if (validate(field)) {
          return true;
        }
      }
    }
  }
}
