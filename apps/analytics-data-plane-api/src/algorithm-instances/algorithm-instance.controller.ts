import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import {
  AlgorithmInstanceDto,
  OrchestrationStatusDto,
  OrchestrationStatusSignalDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  DisableOAuthGuard,
  nonEmptyStringPipe,
  validationPipe
} from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@ApiTags("Algorithm Instances")
@Controller("algorithm-instances")
@DisableOAuthGuard()
export class AlgorithmInstancesController {
  constructor(
    private readonly algorithmInstancesService: AlgorithmInstancesService
  ) {}

  @Post("create")
  @ApiBody({
    type: AlgorithmInstanceDto
  })
  @ApiOkResponse({
    type: OrchestrationStatusDto,
    description: "Successfully created algorithm instance"
  })
  @ApiOperation({
    summary: "Create an algorithm instance",
    description: "Creates a new algorithm instance with the provided details."
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async createAlgorithmInstance(
    @Body(validationPipe) createAlgorithmInstance: AlgorithmInstanceDto,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<OrchestrationStatusDto> {
    return this.algorithmInstancesService.receiveAlgorithmInstanceFromPeer({
      createAlgorithmInstance,
      authorizationHeader
    });
  }

  @Post(":algorithmInstanceId/start")
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: "algorithmInstanceId",
    description: "The ID of the algorithm instance to start",
    type: String,
    required: true,
    example: "12345"
  })
  @ApiOperation({
    summary: "Start an algorithm instance",
    description: "Starts an algorithm instance with the given ID."
  })
  async startAlgorithmInstance(
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<void> {
    return this.algorithmInstancesService.startAlgorithmInstance({
      algorithmInstanceId,
      isInitiator: false,
      authorizationHeader
    });
  }

  @Post(":algorithmInstanceId/orchestration-status")
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: "algorithmInstanceId",
    type: String,
    required: true
  })
  @ApiBody({ type: OrchestrationStatusSignalDto })
  @ApiOperation({
    summary: "Receive orchestration status",
    description:
      "Called by the initiator to propagate the instance-wide orchestration " +
      "outcome (completed / error) to a worker."
  })
  async receiveOrchestrationStatus(
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Body(validationPipe) body: OrchestrationStatusSignalDto,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<void> {
    return this.algorithmInstancesService.receiveOrchestrationStatusFromPeer(
      algorithmInstanceId,
      body.orchestrationStatus,
      authorizationHeader
    );
  }
}
