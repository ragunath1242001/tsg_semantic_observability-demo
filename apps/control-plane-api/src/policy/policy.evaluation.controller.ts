import {
  Controller,
  Logger,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Body,
  Post
} from "@nestjs/common";
import {
  ApiTags,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiBody
} from "@nestjs/swagger";
import { PolicyEvaluationService } from "./policy.evaluation.service.js";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import { EvaluationContext, EvaluationDecision } from "./evaluation.dto.js";
import { Roles, validationPipe } from "@tsg-dsp/common-api";

@Roles(["controlplane_admin"])
@Controller("management/policy/evaluation")
@ApiTags("Evaluation")
@ApiOAuth2(["controlplane_admin"])
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
