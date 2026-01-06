import { HttpStatus, Injectable, Logger } from "@nestjs/common";

import { AnalyticsDataPlaneMode, RootConfig } from "../../config.js";
import { DataPlaneError } from "../../utils/errors/error.js";

@Injectable()
export class SplitModeService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly config: RootConfig) {}

  get mode(): AnalyticsDataPlaneMode {
    return this.config.split.mode;
  }

  get isClientMode(): boolean {
    return this.mode === "client";
  }

  get isServerMode(): boolean {
    return this.mode === "server";
  }

  get isStandaloneMode(): boolean {
    return this.mode === "standalone";
  }

  get hasTransferCapability(): boolean {
    return !this.isClientMode;
  }

  get canCreateAlgorithmInstances(): boolean {
    return !this.isClientMode;
  }

  get canDeleteAlgorithmInstances(): boolean {
    return !this.isClientMode;
  }

  get shouldBridgeJobStatusToServer(): boolean {
    return this.isClientMode;
  }

  get shouldBridgeAlgorithmInstancesToClients(): boolean {
    return this.isServerMode;
  }

  get shouldBridgeAlgorithmEventsToClients(): boolean {
    return this.isServerMode;
  }

  get shouldDelegateStartToClientRunner(): boolean {
    return this.isServerMode;
  }

  requireTransferHandler<T>(
    handler: T | undefined,
    action: string
  ): asserts handler is T {
    if (this.isClientMode) {
      throw new DataPlaneError(
        `${action} is not available in client mode`,
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    }
    if (!handler) {
      throw new DataPlaneError(
        `${action} requires transfer capabilities`,
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    }
  }

  requireCanCreateAlgorithmInstances(): void {
    if (!this.canCreateAlgorithmInstances) {
      throw new DataPlaneError(
        "Creating algorithm instances is not available in client mode",
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    }
  }

  requireProjectAgreementsService<T>(
    service: T | undefined
  ): asserts service is T {
    if (!service) {
      throw new DataPlaneError(
        "Project agreements are not available in this runtime mode",
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    }
  }
}
