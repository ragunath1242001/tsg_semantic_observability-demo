import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos";
import { importJWK, jwtVerify, JWTVerifyResult } from "jose";
import { Repository } from "typeorm";

import { InitClient, RootConfig } from "../config.js";
import { KubernetesService } from "../k8s/kubernetes.service.js";
import { OauthClient } from "../model/client.dao.js";
import { RolesService } from "../roles/roles.service.js";

/** Client assertion type for private_key_jwt as per RFC 7523 */
const JWT_BEARER_ASSERTION_TYPE =
  "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

@Injectable()
export class ClientsService {
  constructor(
    private readonly rootConfig: RootConfig,
    private readonly kubernetesService: KubernetesService,
    @InjectRepository(OauthClient)
    private readonly clientsRepository: Repository<OauthClient>,
    private readonly rolesService: RolesService
  ) {
    this.initialized = this.init();
  }
  private readonly logger: Logger = new Logger(this.constructor.name);
  initialized: Promise<void>;

  async init() {
    await this.rolesService.initialized;

    // Verify if kubernetes secrets are available
    if (
      !this.rootConfig.initClients.length ||
      (await this.clientsRepository.count()) > 0
    ) {
      const existingClients = await this.clientsRepository.find();
      await Promise.allSettled(
        existingClients.map(async (client) => {
          // Only create secrets for clients using symmetric authentication
          if (
            client.clientSecret &&
            (!client.tokenEndpointAuthMethod ||
              client.tokenEndpointAuthMethod === "client_secret_post")
          ) {
            await this.kubernetesService.applySecret(client.secretName, {
              clientId: client.clientId,
              clientSecret: client.clientSecret
            });
          }
        })
      );
      return;
    }

    await Promise.allSettled(
      this.rootConfig.initClients.map(async (client) => {
        try {
          const createdClient = await this.createClient(client);
          this.logger.log(`Initialized client: ${createdClient.clientId}`);
          return createdClient;
        } catch (error) {
          this.logger.error(
            `Failed to initialize client: ${client.clientId}`,
            error
          );
          throw error;
        }
      })
    );
  }

  async getClients(paginationOptions: PaginationOptionsDto) {
    const [data, total] = await this.clientsRepository.findAndCount({
      ...paginationOptions.typeOrm
    });
    return {
      data,
      total
    };
  }

  async getClient(clientId: string): Promise<OauthClient> {
    const client = await this.clientsRepository.findOne({
      where: { clientId: clientId }
    });
    if (!client) {
      throw new AppError(
        `Client with id ${clientId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return client;
  }

  async createClient(
    createClientData: Partial<ClientDto>
  ): Promise<OauthClient> {
    const client = this.clientsRepository.create(
      await this.fromUserInput(createClientData)
    );

    // Only create Kubernetes secrets for clients using symmetric authentication
    if (
      client.clientSecret &&
      (!client.tokenEndpointAuthMethod ||
        client.tokenEndpointAuthMethod === "client_secret_post")
    ) {
      await this.kubernetesService.applySecret(client.secretName, {
        clientId: client.clientId,
        clientSecret: client.clientSecret
      });
    }

    return await this.clientsRepository.save(client);
  }

  /**
   * Transforms roles from string[] to OauthRole[] objects.
   */
  async fromUserInput(
    clientData: Partial<InitClient> | Partial<ClientDto>
  ): Promise<OauthClient> {
    return {
      ...clientData,
      roles: await this.rolesService.getRolesByNames(clientData.roles || [])
    } as OauthClient;
  }

  async deleteClient(id: number): Promise<{ deleted: boolean }> {
    const result = await this.clientsRepository.delete(id);
    if (result.affected === 0) {
      throw new AppError(
        `Client with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return { deleted: true };
  }

  async updateClient(
    id: number,
    updateData: Partial<ClientDto>
  ): Promise<OauthClient> {
    const client = await this.clientsRepository.findOneBy({ id });
    if (!client) {
      throw new AppError(
        `Client with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    // Only update Kubernetes secrets for clients using symmetric authentication
    if (
      client.clientSecret &&
      (!client.tokenEndpointAuthMethod ||
        client.tokenEndpointAuthMethod === "client_secret_post")
    ) {
      await this.kubernetesService.applySecret(client.secretName, {
        clientId: client.clientId,
        clientSecret: client.clientSecret
      });
    }

    return await this.clientsRepository.save({
      ...client,
      ...(await this.fromUserInput(updateData))
    });
  }

  /**
   * Validates a client using symmetric secret authentication.
   */
  async validateClient(client_id: string, client_secret: string) {
    const client = await this.clientsRepository.findOne({
      where: {
        clientId: client_id,
        clientSecret: client_secret
      }
    });
    if (!client) {
      throw new AppError(
        "Invalid client id or secret",
        HttpStatus.UNAUTHORIZED
      );
    }
    return client;
  }

  async validateClientAssertion(
    clientId: string,
    clientAssertion: string,
    clientAssertionType: string,
    tokenEndpoint: string
  ): Promise<OauthClient> {
    // Validate assertion type
    if (clientAssertionType !== JWT_BEARER_ASSERTION_TYPE) {
      throw new AppError(
        `Invalid client_assertion_type. Expected ${JWT_BEARER_ASSERTION_TYPE}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const client = await this.getClient(clientId);

    if (client.tokenEndpointAuthMethod !== "private_key_jwt") {
      throw new AppError(
        "Client is not configured for private_key_jwt authentication",
        HttpStatus.BAD_REQUEST
      );
    }

    const publicKey = await this.getClientPublicKey(client);

    try {
      const result: JWTVerifyResult = await jwtVerify(
        clientAssertion,
        publicKey,
        {
          issuer: clientId,
          subject: clientId,
          audience: tokenEndpoint,
          maxTokenAge: 300 // 5 minutes max token age
        }
      );

      if (!result.payload.jti) {
        throw new AppError(
          "Client assertion must contain a jti claim",
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.debug(`Client ${clientId} authenticated via private_key_jwt`);
      return client;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.warn(
        `Client assertion verification failed for ${clientId}: ${error}`
      );
      throw new AppError("Invalid client assertion", HttpStatus.UNAUTHORIZED);
    }
  }

  private async getClientPublicKey(client: OauthClient) {
    if (client.jwk) {
      return await importJWK(client.jwk);
    }

    throw new AppError(
      "Client does not have a public key configured",
      HttpStatus.BAD_REQUEST
    );
  }
}
