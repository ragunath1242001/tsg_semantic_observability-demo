import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Requires, validationPipe } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { EvaluationContext, EvaluationDecision } from "./evaluation.dto.js";
import { PolicyEvaluationService } from "./policy.evaluation.service.js";

@Requires(Action.READ, Resource.CP_POLICY)
@Controller("management/policy/evaluation")
@ApiTags("Evaluation")
export class PolicyEvaluationController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(
    private readonly policyEvaluationService: PolicyEvaluationService
  ) {}

  @Get(":transferId/lastContext")
  @ApiOperation({
    summary: "Retrieve last evaluation context",
    description:
      "Retrieve last evaluation context of the specified transfer ID."
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: EvaluationContext })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async getLastContext(
    @Param("transferId") transferId: string
  ): Promise<EvaluationContext> {
    return this.policyEvaluationService.getLastContext(transferId);
  }
  @Get(":transferId/lastDecision")
  @ApiOperation({
    summary: "Retrieve last evaluation decision",
    description:
      "Retrieve last evaluation decision of the specified transfer ID."
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: EvaluationDecision })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async getLastDecision(
    @Param("transferId") transferId: string
  ): Promise<EvaluationDecision> {
    return this.policyEvaluationService.getLastDecision(transferId);
  }

  @Post(":transferId/evaluate")
  @Requires(Action.EXECUTE, Resource.CP_POLICY)
  @ApiOperation({
    summary: "Retrieve last evaluation context",
    description:
      "Retrieve last evaluation context of the specified transfer ID."
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: EvaluationContext })
  @ApiOkResponse({ type: EvaluationDecision })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async evaluate(
    @Param("transferId") transferId: string,
    @Body(validationPipe) context: EvaluationContext
  ): Promise<EvaluationDecision> {
    return this.policyEvaluationService.evaluate({
      ...context,
      transferId: transferId
    });
  }

  @Post(":transferId/evaluate/data-plane")
  @ApiOperation({
    summary: "Retrieve last evaluation context",
    description:
      "Retrieve last evaluation context of the specified transfer ID."
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: { type: "object" } })
  @ApiOkResponse({ type: EvaluationDecision })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async evaluateDataPlane(
    @Param("transferId") transferId: string,
    @Body() context: Record<string, any>
  ): Promise<EvaluationDecision> {
    return this.policyEvaluationService.evaluateDataPlane(transferId, context);
  }
}
