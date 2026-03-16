import { DataPlaneError } from "@tsg-dsp/common-data-plane-api";

import type { RootConfig } from "../../config.js";
import { SplitModeService } from "./split-mode.service.js";

function createService(mode: string): SplitModeService {
  const config = { split: { mode } } as unknown as RootConfig;
  return new SplitModeService(config);
}

describe("SplitModeService", () => {
  describe("mode getters", () => {
    it("reports standalone mode correctly", () => {
      const svc = createService("standalone");
      expect(svc.mode).toBe("standalone");
      expect(svc.isStandaloneMode).toBe(true);
      expect(svc.isClientMode).toBe(false);
      expect(svc.isServerMode).toBe(false);
    });

    it("reports client mode correctly", () => {
      const svc = createService("client");
      expect(svc.mode).toBe("client");
      expect(svc.isClientMode).toBe(true);
      expect(svc.isStandaloneMode).toBe(false);
      expect(svc.isServerMode).toBe(false);
    });

    it("reports server mode correctly", () => {
      const svc = createService("server");
      expect(svc.mode).toBe("server");
      expect(svc.isServerMode).toBe(true);
      expect(svc.isClientMode).toBe(false);
      expect(svc.isStandaloneMode).toBe(false);
    });
  });

  describe("capability flags", () => {
    it("standalone has transfer capability", () => {
      expect(createService("standalone").hasTransferCapability).toBe(true);
    });

    it("server has transfer capability", () => {
      expect(createService("server").hasTransferCapability).toBe(true);
    });

    it("client does not have transfer capability", () => {
      expect(createService("client").hasTransferCapability).toBe(false);
    });

    it("standalone can create algorithm instances", () => {
      expect(createService("standalone").canCreateAlgorithmInstances).toBe(
        true
      );
    });

    it("client cannot create algorithm instances", () => {
      expect(createService("client").canCreateAlgorithmInstances).toBe(false);
    });

    it("standalone can delete algorithm instances", () => {
      expect(createService("standalone").canDeleteAlgorithmInstances).toBe(
        true
      );
    });

    it("client cannot delete algorithm instances", () => {
      expect(createService("client").canDeleteAlgorithmInstances).toBe(false);
    });
  });

  describe("bridge direction flags", () => {
    it("client should bridge job status to server", () => {
      expect(createService("client").shouldBridgeJobStatusToServer).toBe(true);
    });

    it("server should not bridge job status to server", () => {
      expect(createService("server").shouldBridgeJobStatusToServer).toBe(false);
    });

    it("server should bridge algorithm instances to clients", () => {
      expect(
        createService("server").shouldBridgeAlgorithmInstancesToClients
      ).toBe(true);
    });

    it("client should not bridge algorithm instances to clients", () => {
      expect(
        createService("client").shouldBridgeAlgorithmInstancesToClients
      ).toBe(false);
    });

    it("server should bridge algorithm events to clients", () => {
      expect(createService("server").shouldBridgeAlgorithmEventsToClients).toBe(
        true
      );
    });

    it("server should delegate start to client runner", () => {
      expect(createService("server").shouldDelegateStartToClientRunner).toBe(
        true
      );
    });

    it("client should not delegate start to client runner", () => {
      expect(createService("client").shouldDelegateStartToClientRunner).toBe(
        false
      );
    });
  });

  describe("requireTransferHandler", () => {
    it("throws in client mode", () => {
      const svc = createService("client");
      expect(() => svc.requireTransferHandler(undefined, "test")).toThrow(
        DataPlaneError
      );
    });

    it("throws when handler is undefined in server mode", () => {
      const svc = createService("server");
      expect(() => svc.requireTransferHandler(undefined, "test")).toThrow(
        DataPlaneError
      );
    });

    it("does not throw when handler is provided in server mode", () => {
      const svc = createService("server");
      expect(() => svc.requireTransferHandler({}, "test")).not.toThrow();
    });
  });

  describe("requireCanCreateAlgorithmInstances", () => {
    it("throws in client mode", () => {
      const svc = createService("client");
      expect(() => svc.requireCanCreateAlgorithmInstances()).toThrow(
        DataPlaneError
      );
    });

    it("does not throw in server mode", () => {
      const svc = createService("server");
      expect(() => svc.requireCanCreateAlgorithmInstances()).not.toThrow();
    });

    it("does not throw in standalone mode", () => {
      const svc = createService("standalone");
      expect(() => svc.requireCanCreateAlgorithmInstances()).not.toThrow();
    });
  });

  describe("requireProjectAgreementsService", () => {
    it("throws when service is undefined", () => {
      const svc = createService("standalone");
      expect(() => svc.requireProjectAgreementsService(undefined)).toThrow(
        DataPlaneError
      );
    });

    it("does not throw when service is provided", () => {
      const svc = createService("standalone");
      expect(() => svc.requireProjectAgreementsService({})).not.toThrow();
    });
  });
});
