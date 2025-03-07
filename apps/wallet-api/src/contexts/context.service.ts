import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { Repository } from "typeorm";

import { JsonLdContextConfig, RootConfig } from "../config.js";
import { JSONLDContext } from "../model/context.dao.js";

@Injectable()
export class ContextService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(JSONLDContext)
    private readonly contextRepository: Repository<JSONLDContext>
  ) {
    this.initialized = this.init();
  }
  initialized: Promise<boolean>;
  private readonly logger = new Logger(this.constructor.name);

  async init() {
    for (const context of this.config.contexts) {
      try {
        await this.insertContext(context);
      } catch (_) {
        this.logger.debug(
          `Context with id ${context.id} already exists, not overriding`
        );
      }
    }
    return true;
  }

  async getContexts(): Promise<JSONLDContext[]> {
    return await this.contextRepository.find({});
  }

  async getContext(id: string): Promise<JSONLDContext> {
    const context = await this.contextRepository.findOneBy({ id: id });
    if (!context) {
      throw new AppError(
        `Context with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return context;
  }

  async getContextByType(credentialType: string): Promise<JSONLDContext> {
    const context = await this.contextRepository.findOneBy({
      credentialType: credentialType,
      issuable: true
    });
    if (!context) {
      throw new AppError(
        `Issuable context for credential type ${credentialType} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return context;
  }

  async insertContext(config: JsonLdContextConfig): Promise<JSONLDContext> {
    if (await this.contextRepository.existsBy({ id: config.id })) {
      throw new AppError(
        `Context with id ${config.id} already exists`,
        HttpStatus.CONFLICT
      );
    }
    return await this.contextRepository.save(config);
  }

  async updateContext(
    id: string,
    config: JsonLdContextConfig
  ): Promise<JSONLDContext> {
    if (await this.contextRepository.existsBy({ id: config.id })) {
      return await this.contextRepository.save({
        ...config,
        id: id
      });
    } else {
      throw new AppError(
        `Context with id ${config.id} does not exists`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async deleteContext(id: string): Promise<void> {
    const context = await this.getContext(id);
    await this.contextRepository.remove(context);
  }
}
