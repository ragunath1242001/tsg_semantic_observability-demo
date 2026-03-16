import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { JobDto, PodListDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";
import { Response } from "express";

import {
  IOrchestrationService,
  JobInfo,
  PodList
} from "./orchestration.interface.js";

@ApiTags("Data Plane Management")
@Controller("management/k8s")
export class OrchestrationManagementController {
  constructor(
    @Inject(IOrchestrationService)
    private readonly orchestrationService: IOrchestrationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/jobs/algorithm-instance/:algorithmInstanceId")
  @Requires(Action.READ, Resource.ADP_ORCHESTRATION)
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
  ): Promise<JobInfo[]> {
    return await this.orchestrationService.getJobsForAlgorithmInstance(
      algorithmInstanceId
    );
  }

  @Get("/jobs/:jobName/pods")
  @Requires(Action.READ, Resource.ADP_ORCHESTRATION)
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
  async getJobPods(@Param("jobName") jobName: string): Promise<PodList> {
    return await this.orchestrationService.getPodsForJob(jobName);
  }

  @Get("/pods/:podName/logs")
  @Requires(Action.READ, Resource.ADP_ORCHESTRATION)
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
  async getJobLogs(@Param("podName") podName: string): Promise<string> {
    return await this.orchestrationService.getPodLogs(podName);
  }

  @Get("/pods/:podName/streamLogs")
  @Requires(Action.READ, Resource.ADP_ORCHESTRATION)
  @ApiOperation({ summary: "Stream job logs" })
  @ApiParam({
    name: "podName",
    description: "The pod name",
    example: "12345678-1234-5678-1234-567812345678",
    required: true,
    type: "string"
  })
  @ApiParam({
    name: "tail",
    description: "Number of lines to include from the end of the logs",
    example: 100,
    required: false,
    type: "number"
  })
  @ApiOkResponse({ type: String, isArray: true })
  @ApiForbiddenResponseDefault()
  async streamJobLogs(
    @Param("podName") podName: string,
    @Res() res: Response,
    @Query("tail", new ParseIntPipe({ optional: true })) tail?: number
  ) {
    const logStream = await this.orchestrationService.watchPodLogs(
      podName,
      tail
    );
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    logStream.pipe(res);
  }

  @Post("/spawn-job")
  @Requires(Action.EXECUTE, Resource.ADP_ORCHESTRATION)
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
      "manual-spawn",
      body.imageName,
      body.command,
      body.fileId
    );
  }
}
