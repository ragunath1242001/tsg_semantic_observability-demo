import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AuthClientService,
  parseNetworkError,
  validateOrRejectSync
} from "@tsg-dsp/common-api";
import { DataPlaneCreation, DataPlaneDetailsDto } from "@tsg-dsp/common-dsp";
import { AxiosInstance } from "axios";
import { plainToInstance } from "class-transformer";
import { Repository } from "typeorm";

import { ControlPlaneConfig } from "../config/index.js";
import { DataPlaneStateDao } from "../dao/index.js";

@Injectable()
export class DataPlaneRegistrationService {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly axiosDataPlane: AxiosInstance;

  constructor(
    @InjectRepository(DataPlaneStateDao)
    protected readonly stateRepository: Repository<DataPlaneStateDao>,
    protected readonly authClient: AuthClientService,
    protected readonly controlPlaneConfig: ControlPlaneConfig
  ) {
    this.axiosDataPlane = authClient.axiosInstance({
      baseURL: controlPlaneConfig.dataPlaneEndpoint
    });
  }

  /**
   * Load existing state from database
   */
  async loadState(): Promise<DataPlaneStateDao | null> {
    const state = await this.stateRepository.findOneBy({ _id: 1 });
    if (state) {
      this.logger.log("Loaded existing data plane state from database");
    }
    return state;
  }

  /**
   * Register data plane with control plane
   */
  async register(
    dataPlaneCreation: DataPlaneCreation
  ): Promise<DataPlaneDetailsDto> {
    this.logger.log("Registering data plane with control plane");

    const state = await this.stateRepository.findOneBy({ _id: 1 });
    if (state) {
      dataPlaneCreation.id = state.id;
    }

    try {
      const response = await this.axiosDataPlane.post<DataPlaneDetailsDto>(
        `/init`,
        dataPlaneCreation
      );
      const details = plainToInstance(DataPlaneDetailsDto, response.data);
      validateOrRejectSync(details);

      await this.saveState(details);

      this.logger.log(`Data plane registered with id: ${details.id}`);

      return details;
    } catch (error) {
      throw parseNetworkError(
        error,
        "registering data plane with control plane"
      );
    }
  }

  /**
   * Save data plane state to database
   */
  async saveState(details: DataPlaneDetailsDto): Promise<DataPlaneStateDao> {
    const state = await this.stateRepository.save({
      _id: 1,
      id: details.id,
      details: details
    });

    this.logger.log(`Data plane state saved with ID: ${state.id}`);
    return state;
  }

  /**
   * Get current state or throw error
   */
  async getState(): Promise<DataPlaneStateDao> {
    const state = await this.stateRepository.findOneBy({ _id: 1 });
    if (!state) {
      throw new Error("Data plane state not found - may not be registered yet");
    }
    return state;
  }

  /**
   * Check if data plane is registered
   */
  async isRegistered(): Promise<boolean> {
    const state = await this.stateRepository.findOneBy({ _id: 1 });
    return !!state;
  }
}
