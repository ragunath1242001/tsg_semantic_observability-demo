import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  AlgorithmInstanceDto,
  CreateAlgorithmInstanceDto,
  SetOrchestrationStatusDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { Requires, validationPipe } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@Controller("management/algorithm-instances")
@ApiTags("Algorithm Instances")
export class AlgorithmInstancesManagementController {
  constructor(
    private readonly algorithmInstancesService: AlgorithmInstancesService
  ) {}

  @Get()
  @Requires(Action.READ, Resource.ADP_ALGORITHM)
  @ApiOperation({
    summary: "Get all algorithm instances",
    description: "Retrieve all algorithm instances"
  })
  @ApiOkResponse({ type: [AlgorithmInstanceDto] })
  @ApiForbiddenResponseDefault()
  findAll() {
    return this.algorithmInstancesService.getAlgorithmInstances();
  }

  @Post()
  @Requires(Action.CREATE, Resource.ADP_ALGORITHM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Create algorithm instance",
    description: "Create a new algorithm instance"
  })
  @ApiBody({
    type: AlgorithmInstanceDto,
    description: "The algorithm instance to create",
    required: true
  })
  @ApiResponse({
    status: 200,
    description: "The algorithm instance has been successfully created",
    type: CreateAlgorithmInstanceDto
  })
  @ApiForbiddenResponseDefault()
  create(
    @Body(validationPipe) createAlgorithmInstance: CreateAlgorithmInstanceDto
  ) {
    return this.algorithmInstancesService.createAlgorithmInstance(
      createAlgorithmInstance
    );
  }

  @Get("transfer/:transferId")
  @Requires(Action.READ, Resource.ADP_ALGORITHM)
  @ApiOperation({
    summary: "Get an algorithm instance by transfer ID",
    description: "Retrieve an algorithm instance by its associated transfer ID"
  })
  @ApiOkResponse({ type: AlgorithmInstanceDto })
  @ApiForbiddenResponseDefault()
  findByTransferId(@Param("transferId") transferId: string) {
    return this.algorithmInstancesService.getAlgorithmInstanceFromTransferId(
      transferId
    );
  }

  @Get(":id")
  @Requires(Action.READ, Resource.ADP_ALGORITHM)
  @ApiOperation({
    summary: "Get an algorithm instance by ID",
    description: "Retrieve an algorithm instance by its ID"
  })
  @ApiOkResponse({ type: AlgorithmInstanceDto })
  @ApiForbiddenResponseDefault()
  async findOne(@Param("id") id: string) {
    return await this.algorithmInstancesService.getAlgorithmInstanceDto(id);
  }

  @Post("prune")
  @Requires(Action.DELETE, Resource.ADP_ALGORITHM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Prune soft-deleted algorithm instances",
    description:
      "Hard-delete algorithm instances that were soft-deleted. " +
      "Use olderThanDays to only prune instances deleted more than N days ago (default: 0 = all)."
  })
  @ApiQuery({
    name: "olderThanDays",
    required: false,
    type: Number,
    description:
      "Only prune instances soft-deleted more than this many days ago. Default: 0 (prune all)."
  })
  @ApiOkResponse({
    description: "The number of pruned algorithm instances",
    schema: {
      type: "object",
      properties: { pruned: { type: "number" } }
    }
  })
  @ApiForbiddenResponseDefault()
  prune(@Query("olderThanDays") olderThanDays?: string) {
    return this.algorithmInstancesService.pruneAlgorithmInstances(
      olderThanDays ? parseInt(olderThanDays, 10) : 0
    );
  }

  @Delete(":id")
  @Requires(Action.DELETE, Resource.ADP_ALGORITHM)
  @ApiOperation({
    summary: "Delete an algorithm instance by ID",
    description:
      "Delete an algorithm instance by its ID. Use hard=true for permanent deletion."
  })
  @ApiQuery({
    name: "hard",
    required: false,
    type: Boolean,
    description:
      "When true, permanently deletes the algorithm instance instead of soft-deleting it."
  })
  @ApiOkResponse({
    description: "The algorithm instance has been successfully deleted"
  })
  @ApiForbiddenResponseDefault()
  remove(@Param("id") id: string, @Query("hard") hard?: string) {
    return this.algorithmInstancesService.removeAlgorithmInstance(
      id,
      hard === "true"
    );
  }

  @Post(":id/orchestration-status")
  @Requires(Action.CREATE, Resource.ADP_ALGORITHM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Manually set orchestration status",
    description:
      "Allows the operator to manually set the orchestration status " +
      "(e.g. signal an error when a job silently fails)."
  })
  @ApiBody({ type: SetOrchestrationStatusDto })
  @ApiOkResponse({
    type: AlgorithmInstanceDto,
    description: "The updated algorithm instance"
  })
  @ApiForbiddenResponseDefault()
  setOrchestrationStatus(
    @Param("id") id: string,
    @Body(validationPipe) body: SetOrchestrationStatusDto
  ) {
    return this.algorithmInstancesService.setOrchestrationStatusManually(
      id,
      body.orchestrationStatus
    );
  }
}
