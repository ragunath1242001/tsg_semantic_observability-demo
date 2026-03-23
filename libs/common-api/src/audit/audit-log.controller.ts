import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NotFoundException,
  Param,
  Query,
  Type
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  Action,
  AuditLogQueryParams,
  AuditSeverity,
  Resource
} from "@tsg-dsp/common-dtos";

import { Requires } from "../auth/abac/abac.decorator.js";
import { UsePagination } from "../utils/pagination/pagination.interceptor.decorator.js";
import { PaginationOptionsDto } from "../utils/pagination/pagination.options.dto.js";
import { Paginated } from "../utils/pagination/pagination.parameters.js";
import { PaginationQuery } from "../utils/pagination/pagination.query.decorator.js";
import { AuditLogDao } from "./audit-log.dao.js";
import { AuditLogQueryService } from "./audit-log-query.service.js";

export interface AuditLogControllerType {
  list(
    paginationOptions: PaginationOptionsDto,
    severity?: AuditSeverity | AuditSeverity[],
    callerSub?: string,
    callerType?: "user" | "service" | "system",
    action?: string | string[],
    resourceType?: string | string[],
    resultAllowed?: string,
    correlationId?: string,
    ipAddress?: string,
    requestPath?: string,
    from?: string,
    to?: string
  ): Promise<Paginated<AuditLogDao[]>>;
  getById(id: string): Promise<AuditLogDao>;
}

/**
 * Creates an audit log controller scoped to the given resource.
 * Each application should call this with their app-specific audit log resource
 * and register the returned class in their module's `controllers` array.
 *
 * @example
 * ```typescript
 * @Module({
 *   controllers: [createAuditLogController(Resource.CP_AUDIT_LOG)],
 * })
 * export class AppModule {}
 * ```
 */
export function createAuditLogController(
  resource: Resource
): Type<AuditLogControllerType> {
  const parseMultiValueQuery = (value?: string | string[]) => {
    if (value === undefined) {
      return undefined;
    }

    const values = (Array.isArray(value) ? value : value.split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (values.length === 0) {
      return undefined;
    }

    return values.length === 1 ? values[0] : values;
  };

  @Injectable()
  @ApiTags("Audit Logs")
  @Controller("management/audit-logs")
  class AuditLogController implements AuditLogControllerType {
    constructor(private readonly queryService: AuditLogQueryService) {}

    @Get()
    @Requires(Action.READ, resource)
    @UsePagination()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
      summary: "List audit log entries",
      description: "Fetches paginated audit log entries with optional filters."
    })
    @ApiQuery({
      name: "severity",
      required: false,
      enum: AuditSeverity,
      isArray: true
    })
    @ApiQuery({ name: "callerSub", required: false, type: String })
    @ApiQuery({ name: "callerType", required: false, type: String })
    @ApiQuery({ name: "action", required: false, type: String, isArray: true })
    @ApiQuery({
      name: "resourceType",
      required: false,
      type: String,
      isArray: true
    })
    @ApiQuery({ name: "resultAllowed", required: false, type: Boolean })
    @ApiQuery({ name: "correlationId", required: false, type: String })
    @ApiQuery({ name: "ipAddress", required: false, type: String })
    @ApiQuery({ name: "requestPath", required: false, type: String })
    @ApiQuery({ name: "from", required: false, type: String })
    @ApiQuery({ name: "to", required: false, type: String })
    async list(
      @PaginationQuery() paginationOptions: PaginationOptionsDto,
      @Query("severity") severity?: AuditSeverity | AuditSeverity[],
      @Query("callerSub") callerSub?: string,
      @Query("callerType") callerType?: "user" | "service" | "system",
      @Query("action") action?: string | string[],
      @Query("resourceType") resourceType?: string | string[],
      @Query("resultAllowed") resultAllowed?: string,
      @Query("correlationId") correlationId?: string,
      @Query("ipAddress") ipAddress?: string,
      @Query("requestPath") requestPath?: string,
      @Query("from") from?: string,
      @Query("to") to?: string
    ): Promise<Paginated<AuditLogDao[]>> {
      const queryFilters = {
        severity: parseMultiValueQuery(severity) as
          | AuditSeverity
          | AuditSeverity[]
          | undefined,
        callerSub,
        callerType,
        action: parseMultiValueQuery(action),
        resourceType: parseMultiValueQuery(resourceType),
        resultAllowed:
          resultAllowed !== undefined ? resultAllowed === "true" : undefined,
        correlationId,
        ipAddress,
        requestPath,
        from,
        to
      } as AuditLogQueryParams;

      return this.queryService.findAll(paginationOptions, queryFilters);
    }

    @Get(":id")
    @Requires(Action.READ, resource)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
      summary: "Get audit log entry by ID",
      description: "Fetches a single audit log entry by its ID."
    })
    async getById(@Param("id") id: string): Promise<AuditLogDao> {
      const entry = await this.queryService.findById(id);
      if (!entry) {
        throw new NotFoundException(`Audit log entry ${id} not found`);
      }
      return entry;
    }
  }

  return AuditLogController;
}
