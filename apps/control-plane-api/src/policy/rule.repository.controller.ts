import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseEnumPipe,
  Post,
  Put
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  nonEmptyStringPipe,
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Requires,
  UsePagination,
  validationPipe
} from "@tsg-dsp/common-api";
import {
  Constraint as DspConstraint,
  ConstraintDto,
  ConstraintSchema,
  deserialize,
  PolicyRuleDto
} from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiConflictResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { DSPError } from "../utils/errors/error.js";
import { ConstraintModel } from "./constraint.dto.js";
import { Rule, RuleType } from "./rule.dto.js";
import { RuleRepositoryService } from "./rule.repository.service.js";

@Controller("management/policy")
@ApiTags("Evaluation")
export class RuleRepositoryController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly ruleRepositoryService: RuleRepositoryService) {}

  @Get("constraint")
  @UsePagination()
  @ApiOperation({
    summary: "Retrieve constraints",
    description:
      "Retrieve constraint templates registered in this control plane"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ConstraintModel] })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getConstraints(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<ConstraintModel[]>> {
    return this.ruleRepositoryService.listConstraint(paginationOptions);
  }

  @Post("constraint/odrl")
  @ApiOperation({
    summary: "Get constraint by ODRL",
    description: "Get constraint based on an ODRL constraint"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ConstraintSchema })
  @ApiOkResponse({ type: ConstraintModel })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getConstraintByOdrl(
    @Body() constraint: ConstraintDto
  ): Promise<ConstraintModel> {
    try {
      const parsed = await deserialize<DspConstraint>(constraint);
      parsed.validate();
    } catch (e) {
      throw new DSPError(
        "Could not parse ODRL constraint",
        HttpStatus.BAD_REQUEST,
        e
      );
    }
    return this.ruleRepositoryService.getConstraintByOdrl(constraint, true);
  }

  @Post("constraint")
  @ApiOperation({
    summary: "Add constraint",
    description: "Add new contraint template"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ConstraintModel })
  @ApiOkResponse({ type: ConstraintModel })
  @ApiBadRequestResponseDefault()
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.CREATE, Resource.CP_POLICY)
  async addConstraint(
    @Body(validationPipe) constraint: ConstraintModel
  ): Promise<ConstraintModel> {
    constraint.id = undefined;
    await this.ruleRepositoryService.addConstraint(constraint);
    return constraint;
  }

  @Get("constraint/:id")
  @ApiOperation({
    summary: "Get constraint",
    description: "Get constraint based on its identifier"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ConstraintModel })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getConstraint(
    @Param("id", nonEmptyStringPipe) id: string
  ): Promise<ConstraintModel> {
    return this.ruleRepositoryService.getConstraint(id);
  }
  @Get("constraint/:id/odrl")
  @ApiOperation({
    summary: "Get constraint ODRL",
    description: "Get constraint based on its identifier and convert to ODRL"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ConstraintModel })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getConstraintOdrl(
    @Param("id", nonEmptyStringPipe) id: string
  ): Promise<ConstraintDto> {
    const constraint = await this.ruleRepositoryService.getConstraint(id);
    return this.ruleRepositoryService.constraintToOdrl(constraint);
  }

  @Delete("constraint/:id")
  @ApiOperation({
    summary: "Delete constraint",
    description: "Delete constraint template"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.DELETE, Resource.CP_POLICY)
  async deleteConstraint(
    @Param("id", nonEmptyStringPipe) id: string
  ): Promise<void> {
    return this.ruleRepositoryService.deleteConstraint(id);
  }

  @Put("constraint/:id")
  @ApiOperation({
    summary: "Update constraint",
    description: "Update constraint template"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ConstraintModel })
  @ApiOkResponse({ type: ConstraintModel })
  @ApiNotFoundResponseDefault()
  @ApiBadRequestResponseDefault()
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.UPDATE, Resource.CP_POLICY)
  async updateConstraint(
    @Param("id", nonEmptyStringPipe) id: string,
    @Body(validationPipe) constraint: ConstraintModel
  ): Promise<ConstraintModel> {
    constraint.id = id;
    await this.ruleRepositoryService.addConstraint(constraint);
    return constraint;
  }

  @Get("rule")
  @UsePagination()
  @ApiOperation({
    summary: "Retrieve rules",
    description: "Retrieve rule templates registered in this control plane"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [Rule] })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getRules(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<Rule[]>> {
    return this.ruleRepositoryService.listRule(paginationOptions);
  }

  @Post("rule")
  @ApiOperation({
    summary: "Add rule",
    description: "Add new contraint template"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: Rule })
  @ApiOkResponse({ type: Rule })
  @ApiBadRequestResponseDefault()
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.CREATE, Resource.CP_POLICY)
  async addRule(@Body(validationPipe) rule: Rule): Promise<Rule> {
    rule.id = undefined;
    await this.ruleRepositoryService.addRule(rule);
    return rule;
  }

  @Get("rule/:id")
  @ApiOperation({
    summary: "Get rule",
    description: "Get rule based on its identifier"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: Rule })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getRule(@Param("id", nonEmptyStringPipe) id: string): Promise<Rule> {
    return this.ruleRepositoryService.getRule(id);
  }
  @Get("rule/:id/odrl")
  @ApiOperation({
    summary: "Get rule ODRL",
    description: "Get rule ODRL based on its identifier"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: Rule })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.CP_POLICY)
  async getRuleOdrl(
    @Param("id", nonEmptyStringPipe) id: string,
    @Param("ruleType", new ParseEnumPipe(RuleType)) ruleType?: RuleType,
    @Param("target") target?: string
  ): Promise<PolicyRuleDto> {
    const rule = await this.ruleRepositoryService.getRule(id);
    return this.ruleRepositoryService.ruleToOdrl(rule, ruleType, target);
  }

  @Delete("rule/:id")
  @ApiOperation({
    summary: "Delete rule",
    description: "Delete rule template"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.DELETE, Resource.CP_POLICY)
  async deleteRule(@Param("id", nonEmptyStringPipe) id: string): Promise<void> {
    return this.ruleRepositoryService.deleteRule(id);
  }

  @Put("rule/:id")
  @ApiOperation({
    summary: "Update rule",
    description: "Update rule template"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: Rule })
  @ApiOkResponse({ type: Rule })
  @ApiNotFoundResponseDefault()
  @ApiBadRequestResponseDefault()
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.UPDATE, Resource.CP_POLICY)
  async updateRule(
    @Param("id", nonEmptyStringPipe) id: string,
    @Body(validationPipe) rule: Rule
  ): Promise<Rule> {
    rule.id = id;
    await this.ruleRepositoryService.addRule(rule);
    return rule;
  }
}
