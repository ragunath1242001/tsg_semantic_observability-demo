import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos";
import { Repository } from "typeorm";

import { InitClient, RootConfig } from "../config.js";
import { KubernetesService } from "../k8s/kubernetes.service.js";
import { OauthClient } from "../model/client.dao.js";
import { RolesService } from "../roles/roles.service.js";

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

    // Skip if no clients to initialize or clients already exist
    if (
      !this.rootConfig.initClients.length ||
      (await this.clientsRepository.count()) > 0
    ) {
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
    await this.kubernetesService.applySecret(client.secretName, {
      clientId: client.clientId,
      clientSecret: client.clientSecret
    });
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
    await this.kubernetesService.applySecret(client.secretName, {
      clientId: client.clientId,
      clientSecret: client.clientSecret
    });
    return await this.clientsRepository.save({
      ...client,
      ...(await this.fromUserInput(updateData))
    });
  }

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
}
