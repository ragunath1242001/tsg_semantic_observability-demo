import { EventEmitter2 } from "@nestjs/event-emitter";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { vi } from "vitest";

import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { SplitModeService } from "../bridge/split-mode/split-mode.service.js";
import { RootConfig } from "../config.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

describe("AlgorithmInstancesService (client peer start)", () => {
  it("spawns a job when started by peer in client mode", async () => {
    const repo = {
      findOne: vi.fn(),
      save: vi.fn(),
      create: vi.fn().mockImplementation((x) => ({ id: randomUUID(), ...x }))
    } as unknown as Repository<AlgorithmInstanceDao>;
    const eventEmitter = {
      emit: vi.fn()
    } as unknown as EventEmitter2;

    const catalog = {
      getParticipantId: vi
        .fn<(...args: unknown[]) => Promise<string>>()
        .mockResolvedValue("did:web:client")
    } as unknown as CatalogClientService;

    const config = {
      split: { mode: "client" }
    } as unknown as RootConfig;

    const splitMode = new SplitModeService(config);

    const bridgeWs = {
      emit: vi.fn()
    } as unknown as BridgeWsClientService;

    const service = new AlgorithmInstancesService(
      repo,
      eventEmitter,
      catalog,
      config,
      splitMode,
      bridgeWs
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
    (repo.save as any).mockImplementation(async (x: any) => x);

    await service.startAlgorithmInstance({
      algorithmInstanceId: algorithmInstance.id,
      isInitiator: false,
      authorizationHeader: "Bearer token"
    });

    // Client should report status back to server.
    expect((bridgeWs as any).emit).toHaveBeenCalledWith(
      "client.job.status",
      expect.objectContaining({
        algorithmInstanceId: algorithmInstance.id,
        status: "running"
      })
    );

    // And it should spawn the job locally.
    expect((eventEmitter as any).emit).toHaveBeenCalledWith(
      "job.spawn",
      expect.objectContaining({
        algorithmInstanceId: algorithmInstance.id,
        participantId: "did:web:client",
        imageName: "some-image",
        datasetId: "urn:uuid:ds"
      })
    );
  });
});
