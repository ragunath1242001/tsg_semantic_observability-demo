import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  AlgorithmInstanceDto,
  CreateAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { Requires } from "@tsg-dsp/common-api";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
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
    private readonly algorithmInstancesService: AlgorithmInstancesService,
    private readonly catalog: CatalogClientService
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
  create(@Body() createAlgorithmInstance: CreateAlgorithmInstanceDto) {
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

  @Delete(":id")
  @Requires(Action.DELETE, Resource.ADP_ALGORITHM)
  @ApiOperation({
    summary: "Delete an algorithm instance by ID",
    description: "Delete an algorithm instance by its ID"
  })
  @ApiOkResponse({
    description: "The algorithm instance has been successfully deleted"
  })
  @ApiForbiddenResponseDefault()
  remove(@Param("id") id: string) {
    return this.algorithmInstancesService.removeAlgorithmInstance(id);
  }
}
