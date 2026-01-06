import { jest } from "@jest/globals";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
import { Repository } from "typeorm";

import { SplitModeService } from "../bridge/split-mode/split-mode.service.js";
import { RootConfig } from "../config.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

describe("AlgorithmInstancesService (server peer start)", () => {
  it("emits a start-requested event (does not spawn job) when started by peer in server mode", async () => {
    const repo = {
      findOne: jest.fn(),
      save: jest.fn()
    } as unknown as Repository<AlgorithmInstanceDao>;

    const eventEmitter = {
      emit: jest.fn()
    } as unknown as EventEmitter2;

    const catalog = {
      getParticipantId: jest
        .fn<(...args: unknown[]) => Promise<string>>()
        .mockResolvedValue("did:web:server")
    } as unknown as CatalogClientService;

    const config = {
      split: { mode: "server" }
    } as unknown as RootConfig;

    const splitMode = new SplitModeService(config);

    const service = new AlgorithmInstancesService(
      repo,
      eventEmitter,
      catalog,
      config,
      splitMode
    );

    const algorithmInstance: any = {
      id: "urn:uuid:test",
      status: "pending",
      startedAt: undefined,
      finishedAt: undefined,
      algorithmDefinition: { image: "some-image" },
      participants: [{ didId: "did:web:client", dataset: "urn:uuid:ds" }],
      transfers: [{ secret: "token" }],
      algorithmEvents: [],
      internalEvents: []
    };

    (repo.findOne as any).mockResolvedValue(algorithmInstance);

    await service.startAlgorithmInstance({
      algorithmInstanceId: algorithmInstance.id,
      isInitiator: false,
      authorizationHeader: "Bearer token"
    });

    expect((eventEmitter as any).emit).toHaveBeenCalledWith(
      "algorithm-instances.start-requested",
      expect.objectContaining({
        algorithmInstanceId: algorithmInstance.id,
        requestedAt: expect.any(Date)
      })
    );

    // Server mode should not mutate local state or spawn jobs directly.
    expect(repo.save as any).not.toHaveBeenCalled();
    expect((eventEmitter as any).emit).not.toHaveBeenCalledWith(
      "job.spawn",
      expect.anything()
    );
  });
});
