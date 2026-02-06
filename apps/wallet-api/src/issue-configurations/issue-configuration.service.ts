import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { Repository } from "typeorm";

import { IssueConfigurationConfig, RootConfig } from "../config.js";
import { IssueConfiguration } from "../model/issue-configuration.dao.js";

@Injectable()
export class IssueConfigurationService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(IssueConfiguration)
    private readonly issueConfigurationRepository: Repository<IssueConfiguration>
  ) {
    this.initialized = this.init();
  }
  initialized: Promise<boolean>;
  private readonly logger = new Logger(this.constructor.name);

  async init() {
    for (const issueConfiguration of this.config.issueConfigurations) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.insertIssueConfiguration(issueConfiguration);
      } catch (_) {
        this.logger.debug(
          `Issue configuration with id ${issueConfiguration.id} already exists, not overriding`
        );
      }
    }
    return true;
  }

  async getIssueConfigurations(): Promise<IssueConfiguration[]> {
    return await this.issueConfigurationRepository.find({});
  }

  async getIssueConfiguration(id: string): Promise<IssueConfiguration> {
    const issueConfig = await this.issueConfigurationRepository.findOneBy({
      id: id
    });
    if (!issueConfig) {
      throw new AppError(
        `Issue configuration with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return issueConfig;
  }

  async getIssueConfigurationByType(
    credentialType: string
  ): Promise<IssueConfiguration> {
    const issueConfig = await this.issueConfigurationRepository.findOneBy({
      credentialType: credentialType
    });
    if (!issueConfig) {
      throw new AppError(
        `Issuable issue configuration for credential type ${credentialType} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return issueConfig;
  }

  async insertIssueConfiguration(
    config: IssueConfigurationConfig
  ): Promise<IssueConfiguration> {
    if (await this.issueConfigurationRepository.existsBy({ id: config.id })) {
      throw new AppError(
        `Issue configuration with id ${config.id} already exists`,
        HttpStatus.CONFLICT
      );
    }
    return await this.issueConfigurationRepository.save(
      this.issueConfigurationRepository.create(config)
    );
  }

  async updateIssueConfiguration(
    id: string,
    config: IssueConfigurationConfig
  ): Promise<IssueConfiguration> {
    if (await this.issueConfigurationRepository.existsBy({ id: config.id })) {
      return await this.issueConfigurationRepository.save(
        this.issueConfigurationRepository.create({
          ...config,
          id: id
        })
      );
    } else {
      throw new AppError(
        `Issue configuration with id ${config.id} does not exists`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async deleteIssueConfiguration(id: string): Promise<void> {
    const issueConfig = await this.getIssueConfiguration(id);
    await this.issueConfigurationRepository.remove(issueConfig);
  }
}
