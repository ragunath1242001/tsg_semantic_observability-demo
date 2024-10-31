import { Injectable } from "@nestjs/common";
import { LoggingConfig } from "../config";
import { EgressLogDao, IngressLogDao } from "./logging.dao";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, ILike, Repository } from "typeorm";
import { PageDto, PageMetaDto, PageOptionsDto } from "../utils/pagination";
import { LogFilterDto, LogEntry } from "./logging.dto";

@Injectable()
export class LoggingService {
  constructor(
    private readonly config: LoggingConfig,
    @InjectRepository(IngressLogDao)
    private readonly ingressRepository: Repository<IngressLogDao>,
    @InjectRepository(EgressLogDao)
    private readonly egressRepository: Repository<EgressLogDao>
  ) {}

  async getIngressLog(
    pageOptions: PageOptionsDto,
    filter: LogFilterDto
  ): Promise<PageDto<IngressLogDao>> {
    const whereClause = this.filterClause(filter);
    const [entities, itemCount] = await this.ingressRepository.findAndCount({
      order: {
        date: pageOptions.order
      },
      skip: pageOptions.skip,
      take: pageOptions.take,
      where: whereClause
    });
    const meta = new PageMetaDto({ itemCount, pageOptions });
    return new PageDto(entities, meta);
  }

  async getEgressLog(
    pageOptions: PageOptionsDto,
    filter: LogFilterDto
  ): Promise<PageDto<IngressLogDao>> {
    const whereClause = this.filterClause(filter);
    const [entities, itemCount] = await this.egressRepository.findAndCount({
      order: {
        date: pageOptions.order
      },
      skip: pageOptions.skip,
      take: pageOptions.take,
      where: whereClause
    });
    const meta = new PageMetaDto({ itemCount, pageOptions });
    return new PageDto(entities, meta);
  }

  async insertIngressLog(entry: LogEntry): Promise<IngressLogDao> {
    return await this.ingressRepository.save(entry);
  }

  async insertEgressLog(entry: LogEntry): Promise<EgressLogDao> {
    return await this.egressRepository.save(entry);
  }

  private filterClause(filter: LogFilterDto) {
    const filterClause: FindOptionsWhere<LogEntry> = {};
    if (filter.remoteParty) {
      filterClause.remoteParty = ILike(`%${filter.remoteParty}%`);
    }
    if (filter.transferId) {
      filterClause.transferId = ILike(`%${filter.transferId}%`);
    }
    if (filter.datasetId) {
      filterClause.datasetId = ILike(`%${filter.datasetId}%`);
    }
    if (filter.status) {
      if (filter.status.toLowerCase().endsWith("xx")) {
        const range = parseInt(filter.status[0]);
        filterClause.status = Between(range * 100, (range + 1) * 100 - 1);
      } else {
        filterClause.status = parseInt(filter.status);
      }
    }
    return filterClause;
  }
}
