import { Injectable, Logger, Optional } from "@nestjs/common";
import { SemanticObservabilityEvent } from "@tsg-dsp/semantic-observability";
import axios, { AxiosInstance } from "axios";

import { RootConfig, SemanticObservabilityConfig } from "../config.js";

@Injectable()
export class SemanticObservabilitySdoExporterService {
  private readonly logger = new Logger(this.constructor.name);
  private readonly axios: AxiosInstance;

  constructor(
    @Optional()
    private readonly semanticObservabilityConfig?: SemanticObservabilityConfig,
    @Optional()
    private readonly rootConfig?: RootConfig
  ) {
    this.axios = axios.create({
      timeout:
        this.semanticObservabilityConfig?.sdoExport
          ?.timeoutInMilliseconds ?? 5000
    });
  }

  async exportEvent(event: SemanticObservabilityEvent): Promise<void> {
    const exportConfig = this.semanticObservabilityConfig?.sdoExport;
    if (!exportConfig?.enabled || !exportConfig.endpoint) {
      return;
    }

    try {
      const participantId =
        exportConfig.participantId ?? this.rootConfig?.iam?.didId;
      if (!participantId || !exportConfig.apiKey) {
        this.logger.warn(
          "SDO export is enabled but participantId or apiKey is missing"
        );
        return;
      }
      await this.axios.post(
        exportConfig.endpoint,
        {
          participantId,
          events: [event]
        },
        {
          headers: {
            "X-SDO-Participant-Id": participantId,
            ...(exportConfig.apiKey
              ? {
                  "X-SDO-API-Key": exportConfig.apiKey
                }
              : {})
          }
        }
      );
    } catch (error) {
      this.logger.warn(
        "Could not export semantic observability event to SDO collector",
        error instanceof Error ? error.message : undefined
      );
    }
  }
}
