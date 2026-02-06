import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AlgorithmInstanceDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@Controller("management/algorithm-instances")
@ApiTags("Algorithm Instances")
@Requires(Action.READ, Resource.ADP_ALGORITHM)
export class AlgorithmInstancesReadOnlyManagementController {
  constructor(
    private readonly algorithmInstancesService: AlgorithmInstancesService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get all algorithm instances (read-only)",
    description: "Retrieve all algorithm instances"
  })
  @ApiOkResponse({ type: [AlgorithmInstanceDto] })
  @ApiForbiddenResponseDefault()
  findAll() {
    return this.algorithmInstancesService.getAlgorithmInstances();
  }

  @Get("transfer/:transferId")
  @ApiOperation({
    summary: "Get an algorithm instance by transfer ID (read-only)",
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
  @ApiOperation({
    summary: "Get an algorithm instance by ID (read-only)",
    description: "Retrieve an algorithm instance by its ID"
  })
  @ApiOkResponse({ type: AlgorithmInstanceDto })
  @ApiForbiddenResponseDefault()
  async findOne(@Param("id") id: string) {
    return await this.algorithmInstancesService.getAlgorithmInstanceDto(id);
  }
}
