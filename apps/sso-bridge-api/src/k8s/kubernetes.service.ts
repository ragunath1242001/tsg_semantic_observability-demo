import { Injectable, Logger } from "@nestjs/common";
import {
  KubeConfig,
  CoreV1Api,
  V1Secret,
  ApiException
} from "@kubernetes/client-node";
import { RootConfig } from "../config.js";
import { AppError } from "@tsg-dsp/common-api";

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private kubeConfig: KubeConfig;
  private coreV1Api: CoreV1Api;

  constructor(private config: RootConfig) {
    this.kubeConfig = new KubeConfig();
    try {
      // Load the kubeconfig from the default location (e.g. ~/.kube/config) or within cluster
      this.kubeConfig.loadFromDefault();
      this.coreV1Api = this.kubeConfig.makeApiClient(CoreV1Api);
      this.logger.debug("KubeConfig loaded successfully");
    } catch (error) {
      this.logger.error("Failed to load kubeconfig", error);
      throw error;
    }
  }

  /**
   * Create or update a Kubernetes secret.
   * The secret's data should be provided as key-value pairs encoded in base64.
   * If the secret already exists, it will be updated.
   * @param namespace - Kubernetes namespace.
   * @param name - Name of the secret.
   * @param data - Key-value pairs (values must be already base64-encoded).
   */
  async applySecret(
    name: string,
    data: Record<string, string>
  ): Promise<V1Secret> {
    const encodedData: Record<string, string> = {};
    for (const key in data) {
      encodedData[key] = Buffer.from(data[key]).toString("base64");
    }
    const namespace = this.config.kubernetesNamespace;
    const body: V1Secret = {
      metadata: { name: name, namespace },
      data: encodedData,
      type: "Opaque"
    };

    try {
      // Try to create the secret
      const createResponse = await this.coreV1Api.createNamespacedSecret({
        namespace,
        body
      });
      this.logger.debug(`Created secret ${name} in namespace ${namespace}`);
      return createResponse;
    } catch (createError: any) {
      // If the secret already exists (HTTP 409 Conflict), update it
      if (createError instanceof ApiException && createError.code === 409) {
        try {
          const updateResponse = await this.coreV1Api.replaceNamespacedSecret({
            name,
            namespace,
            body
          });
          this.logger.debug(`Updated secret ${name} in namespace ${namespace}`);
          return updateResponse;
        } catch (updateError: any) {
          throw new AppError(
            {
              message: `Error updating secret ${name} in namespace ${namespace}`,
              details: updateError.body
            },
            updateError.code || 500
          ).andLog(this.logger);
        }
      }
      throw new AppError(
        {
          message: `Error updating secret ${name} in namespace ${namespace}`,
          details: createError.body
        },
        createError.code || 500
      ).andLog(this.logger);
    }
  }
}
