import { HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { OauthClient } from "../model/client.dao.js";
import { AppError, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { InjectRepository } from "@nestjs/typeorm";
import { RootConfig } from "../config.js";
import { KubernetesService } from "../k8s/kubernetes.service.js";

@Injectable()
export class ClientsService {
  constructor(
    private readonly rootConfig: RootConfig,
    private readonly kubernetesService: KubernetesService,
    @InjectRepository(OauthClient)
    private readonly clientsRepository: Repository<OauthClient>
  ) {
    this.initialized = this.init();
  }
  initialized: Promise<void>;

  async init() {
    if (
      this.rootConfig.initClients.length &&
      (await this.clientsRepository.count()) === 0
    ) {
      await Promise.allSettled(
        this.rootConfig.initClients.map(async (client) => {
          await this.createClient(client);
        })
      );
    }
  }
  async getClients(paginationOptions: PaginationOptionsDto) {
    const [data, total] = await this.clientsRepository.findAndCount(
      paginationOptions.typeOrm
    );
    return {
      data,
      total
    };
  }

  async getClient(clientId: string): Promise<OauthClient> {
    const client = await this.clientsRepository.findOneBy({ clientId });
    if (!client) {
      throw new AppError(
        `Client with id ${clientId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return client;
  }

  async createClient(
    createClientData: Partial<OauthClient>
  ): Promise<OauthClient> {
    const client = this.clientsRepository.create(createClientData);
    await this.kubernetesService.applySecret(client.secretName, {
      clientId: client.clientId,
      clientSecret: client.clientSecret
    });
    return await this.clientsRepository.save(client);
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
    updateData: Partial<OauthClient>
  ): Promise<OauthClient> {
    const client = await this.clientsRepository.findOneBy({ id });
    if (!client) {
      throw new AppError(
        `Client with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    Object.assign(client, updateData);
    await this.kubernetesService.applySecret(client.secretName, {
      clientId: client.clientId,
      clientSecret: client.clientSecret
    });
    return await this.clientsRepository.save(client);
  }

  async validateClient(client_id: string, client_secret: string) {
    const client = await this.clientsRepository.findOneBy({
      clientId: client_id,
      clientSecret: client_secret
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
