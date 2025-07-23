import { V1Job, V1PodList } from "@kubernetes/client-node";
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { JobDto, PodListDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { Roles } from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { OrchestrationService } from "./orchestration.service.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("management/k8s")
@Roles("controlplane_dataplane")
export class OrchestrationManagementController {
  constructor(private readonly orchestrationService: OrchestrationService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/jobs/algorithm-instance/:algorithmInstanceId")
  @ApiOperation({ summary: "Get jobs for algorithm instance" })
  @ApiParam({
    name: "algorithmInstanceId",
    description: "The algorithm instance ID",
    example: "urn:uuid:12345678-1234-5678-1234-567812345678",
    required: true,
    type: "string"
  })
  @ApiOkResponse({ type: [JobDto] })
  @ApiForbiddenResponseDefault()
  async getJobsForAlgorithmInstance(
    @Param("algorithmInstanceId") algorithmInstanceId: string
  ): Promise<V1Job[]> {
    return await this.orchestrationService.getJobsForAlgorithmInstance(
      algorithmInstanceId
    );
  }

  @Get("/jobs/:jobName/pods")
  @ApiOperation({ summary: "Get job pods" })
  @ApiParam({
    name: "jobName",
    description: "The job name",
    example: "12345678-1234-5678-1234-567812345678",
    required: true,
    type: "string"
  })
  @ApiOkResponse({ type: PodListDto })
  @ApiForbiddenResponseDefault()
  async getJobPods(@Param("jobName") jobName: string): Promise<V1PodList> {
    return await this.orchestrationService.getPodsForJob(jobName);
  }

  @Get("/pods/:podName/logs")
  @ApiOperation({ summary: "Get job logs" })
  @ApiParam({
    name: "podName",
    description: "The pod name",
    example: "12345678-1234-5678-1234-567812345678",
    required: true,
    type: "string"
  })
  @ApiOkResponse({ type: String })
  @ApiForbiddenResponseDefault()
  async getJobLogs(@Param("podName") podName: string) {
    return await this.orchestrationService.getPodLogs(podName);
  }

  @Post("/spawn-job")
  @ApiOperation({ summary: "Spawn a job" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        imageName: { type: "string" },
        algorithmInstanceId: { type: "string" },
        command: { type: "array", items: { type: "string" } },
        fileId: { type: "string" }
      },
      example: {
        imageName: "busybox",
        algorithmInstanceId: "urn:uuid:12345678-1234-5678-1234-567812345678",
        command: ["echo", "Hello, World!"]
      }
    }
  })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiForbiddenResponseDefault()
  async spawnJob(
    @Body()
    body: {
      imageName: string;
      algorithmInstanceId: string;
      command?: string[];
      fileId?: string;
    }
  ) {
    return await this.orchestrationService.spawnJob(
      body.algorithmInstanceId,
      body.imageName,
      body.command,
      body.fileId
    );
  }
}
