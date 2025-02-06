import { HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { OauthClient } from "../model/client.dao.js";
import { AppError } from "@tsg-dsp/common-api";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(OauthClient)
    private readonly clientsRepository: Repository<OauthClient>
  ) {}

  async getClients() {
    return await this.clientsRepository.find();
  }

  async createClient(
    createClientData: Partial<OauthClient>
  ): Promise<OauthClient> {
    const client = this.clientsRepository.create(createClientData);
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
    return await this.clientsRepository.save(client);
  }
}
