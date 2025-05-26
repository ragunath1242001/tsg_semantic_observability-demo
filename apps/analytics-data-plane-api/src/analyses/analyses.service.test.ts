import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";

import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/dao/algorithm-event.dao.js";
import { InternalEventDao } from "../events/dao/internal-event.dao.js";
import { AnalysesService } from "./analyses.service.js";
import { AnalysisDao } from "./dao/analysis.dao.js";
import { CreateAnalysisDto } from "./dto/create-analysis.dto.js";

describe("AnalysesService", () => {
  let service: AnalysesService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AnalysisDao,
          InternalEventDao,
          AlgorithmEventDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AnalysisDao,
          InternalEventDao,
          AlgorithmEventDao
        ])
      ],
      providers: [AnalysesService]
    }).compile();

    service = module.get<AnalysesService>(AnalysesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should create an analysis", async () => {
    const createAnalysisDto: CreateAnalysisDto = {
      name: "Test Analysis",
      participantIds: [
        "did:web:localhost",
        "did:web:remoteparty",
        "did:web:remoteparty2"
      ]
    };

    const result = await service.create(createAnalysisDto);
    expect(result).toBeDefined();
    expect(result.name).toBe(createAnalysisDto.name);
    expect(result.participantIds).toEqual(createAnalysisDto.participantIds);
    expect(result.status).toBe("pending");
    expect(result.startedAt).toBeDefined();

    const findAllResult = await service.getAnalyses();
    expect(findAllResult).toBeDefined();
  });
});
