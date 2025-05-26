import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";

import { TransferDao } from "../dataplane/transfer.dao.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { AnalysisDao } from "./dao/analysis.dao.js";
import { CreateAnalysisDto } from "./dto/create-analysis.dto.js";

@Injectable()
export class AnalysesService {
  constructor(
    @InjectRepository(AnalysisDao)
    private readonly analysisRepository: Repository<AnalysisDao>
  ) {}

  // Mapping from access token to analysis id
  private readonly accessTokens = new Map<string, string>();

  async create(createAnalysisDto: CreateAnalysisDto): Promise<AnalysisDao> {
    const analysis = this.analysisRepository.create({
      id: `urn:uuid:${crypto.randomUUID()}`,
      name: createAnalysisDto.name,
      transfers: [],
      participantIds: createAnalysisDto.participantIds,
      algorithmEvents: [],
      internalEvents: [],
      status: "pending",
      startedAt: new Date()
    });

    return await this.analysisRepository.save(analysis);
  }

  async getAnalyses(): Promise<AnalysisDao[]> {
    return await this.analysisRepository.find({
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });
  }

  async getAnalyis(id: string): Promise<AnalysisDao> {
    const analyis = await this.analysisRepository.findOne({
      where: { id },
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });
    if (!analyis) {
      throw new DataPlaneError(
        `Analysis with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return analyis;
  }

  async removeAnalysis(id: string): Promise<void> {
    const result = await this.analysisRepository.delete(id);
    if (result.affected === 0) {
      throw new DataPlaneError(
        `Analysis with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async linkTransfer({
    analysisId,
    transfer
  }: {
    analysisId: string;
    transfer: TransferDao;
  }) {
    const analysis = await this.getAnalyis(analysisId);

    if (analysis.transfers.some((t) => t.id === transfer.id)) {
      throw new DataPlaneError(
        `Transfer with id ${transfer.id} already linked to analysis ${analysisId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    analysis.transfers.push(transfer);

    return await this.analysisRepository.save(analysis);
  }

  async getAnalysisFromTransferId(transferId: string) {
    const analysis = await this.analysisRepository
      .createQueryBuilder("analysis")
      .innerJoin(
        "analysis.transfers",
        "transfer",
        "transfer.id = :transferId",
        { transferId }
      )
      .getOne();

    if (!analysis) {
      throw new DataPlaneError(
        `Analysis for transferId ${transferId} not found`,
        404
      );
    }

    return analysis;
  }

  async createAccessToken(analysisId: string): Promise<string> {
    // This currently assumes max one job per analysis
    const analysis = await this.getAnalyis(analysisId);
    if (!analysis) {
      throw new DataPlaneError(
        `Analysis with id ${analysisId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    const accessToken = randomBytes(16).toString("hex");
    this.accessTokens.set(accessToken, analysisId);

    return accessToken;
  }

  async verifyAnalysisToken(analysisId: string, token: string) {
    const analysisFromToken = this.accessTokens.get(token);
    if (!analysisFromToken || analysisFromToken !== analysisId) {
      throw new DataPlaneError(`No analysis found for token`, 404);
    }
  }
}
