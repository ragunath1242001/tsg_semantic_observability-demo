import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditLogQueryParams } from "@tsg-dsp/common-dtos";
import {
  Between,
  FindOptionsWhere,
  ILike,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository
} from "typeorm";

import { PaginationOptionsDto } from "../utils/pagination/pagination.options.dto.js";
import { Paginated } from "../utils/pagination/pagination.parameters.js";
import { AuditLogDao } from "./audit-log.dao.js";

@Injectable()
export class AuditLogQueryService {
  constructor(
    @InjectRepository(AuditLogDao)
    private readonly repository: Repository<AuditLogDao>
  ) {}

  async findAll(
    paginationOptions: PaginationOptionsDto,
    filters?: AuditLogQueryParams
  ): Promise<Paginated<AuditLogDao[]>> {
    const where: FindOptionsWhere<AuditLogDao> = {};
    const asArray = <T>(value?: T | T[]) => {
      if (value === undefined) {
        return undefined;
      }

      return Array.isArray(value) ? value : [value];
    };
    const severityValues = asArray(filters?.severity);
    const actionValues = asArray(filters?.action);
    const resourceTypeValues = asArray(filters?.resourceType);

    if (severityValues?.length) {
      where.severity =
        severityValues.length === 1 ? severityValues[0] : In(severityValues);
    }
    if (filters?.callerSub) {
      where.callerSub = ILike(`%${filters.callerSub}%`);
    }
    if (filters?.callerType) {
      where.callerType = filters.callerType;
    }
    if (actionValues?.length) {
      where.action =
        actionValues.length === 1 ? actionValues[0] : In(actionValues);
    }
    if (resourceTypeValues?.length) {
      where.resourceType =
        resourceTypeValues.length === 1
          ? resourceTypeValues[0]
          : In(resourceTypeValues);
    }
    if (filters?.resultAllowed !== undefined) {
      where.resultAllowed = filters.resultAllowed;
    }
    if (filters?.correlationId) {
      where.correlationId = filters.correlationId;
    }
    if (filters?.ipAddress) {
      where.ipAddress = ILike(`%${filters.ipAddress}%`);
    }
    if (filters?.requestPath) {
      where.requestPath = ILike(`%${filters.requestPath}%`);
    }

    if (filters?.from && filters?.to) {
      where.timestamp = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters?.from) {
      where.timestamp = MoreThanOrEqual(new Date(filters.from));
    } else if (filters?.to) {
      where.timestamp = LessThanOrEqual(new Date(filters.to));
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      ...paginationOptions.typeOrm
    });

    return { data, total };
  }

  async findById(id: string): Promise<AuditLogDao | null> {
    return this.repository.findOneBy({ id });
  }
}
