import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmInstanceDto,
  CreateAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { AuthClientService, parseNetworkError } from "@tsg-dsp/common-api";
import { AxiosInstance } from "axios";
import { plainToInstance } from "class-transformer";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";

@Injectable()
export class AlgorithmInstancesService {
  constructor(
    private readonly config: RootConfig,
    authClient: AuthClientService,
    @InjectRepository(AlgorithmInstanceDao)
    private readonly algorithmInstanceRepository: Repository<AlgorithmInstanceDao>
  ) {
    this.axiosManagement = authClient.axiosInstance({
      baseURL: this.config.controlPlane.managementEndpoint
    });
  }

  private readonly axiosManagement: AxiosInstance;

  // Mapping from access token to algorithm instances id
  private readonly accessTokens = new Map<string, string>();

  async createAlgorithmInstance(
    createAlgorithmInstance: CreateAlgorithmInstanceDto
  ): Promise<AlgorithmInstanceDto> {
    const algorithmInstance = await this.algorithmInstanceRepository.save({
      ...createAlgorithmInstance,
      createdDate: new Date(),
      status: "pending",
      startedAt: undefined,
      finishedAt: undefined,
      transfers: [],
      algorithmEvents: [],
      internalEvents: []
    });

    return plainToInstance(AlgorithmInstanceDto, algorithmInstance);
  }

  async getAlgorithmInstances(): Promise<AlgorithmInstanceDto[]> {
    const result = await this.algorithmInstanceRepository.find({
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });
    return plainToInstance(AlgorithmInstanceDto, result);
  }

  async getAlgorithmInstance(id: string): Promise<AlgorithmInstanceDao> {
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: { id },
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });
    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return algorithmInstance;
  }

  async getAlgorithmInstanceDto(id: string): Promise<AlgorithmInstanceDto> {
    const algorithmInstance = await this.getAlgorithmInstance(id);
    return plainToInstance(AlgorithmInstanceDto, algorithmInstance);
  }

  async removeAlgorithmInstance(id: string): Promise<void> {
    const result = await this.algorithmInstanceRepository.delete(id);
    if (result.affected === 0) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async linkTransfer({
    algorithmInstanceId,
    transfer
  }: {
    algorithmInstanceId: string;
    transfer: TransferDao;
  }) {
    const algorithmInstance =
      await this.getAlgorithmInstance(algorithmInstanceId);

    if (algorithmInstance.transfers.some((t) => t.id === transfer.id)) {
      throw new DataPlaneError(
        `Transfer with id ${transfer.id} already linked to algorithmInstance ${algorithmInstanceId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    algorithmInstance.transfers.push(transfer);

    return await this.algorithmInstanceRepository.save(algorithmInstance);
  }

  async getAlgorithmInstanceFromTransferId(transferId: string) {
    const algorithmInstance = await this.algorithmInstanceRepository.findOneBy({
      transfers: { id: transferId }
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance for transferId ${transferId} not found`,
        404
      );
    }

    return plainToInstance(AlgorithmInstanceDto, algorithmInstance);
  }

  async createAccessToken(algorithmInstanceId: string): Promise<string> {
    await this.getAlgorithmInstance(algorithmInstanceId);

    const accessToken = randomBytes(16).toString("hex");
    this.accessTokens.set(accessToken, algorithmInstanceId);

    return accessToken;
  }

  async verifyAlgorithmInstanceToken(
    algorithmInstanceId: string,
    token: string
  ) {
    const algorithmInstanceFromToken = this.accessTokens.get(token);
    if (
      !algorithmInstanceFromToken ||
      algorithmInstanceFromToken !== algorithmInstanceId
    ) {
      throw new DataPlaneError(`Invalid token for algorithm instance`, 403);
    }
  }

  async getParticipantCatalog(participantId: string) {
    try {
      const response = await this.axiosManagement(
        `/registry/catalogs/${participantId}`
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `Error fetching catalog for participant ${participantId}`
      );
    }
  }
}
