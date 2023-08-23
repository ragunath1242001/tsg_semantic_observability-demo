import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Clients } from "../model/clients.dao.js";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Clients) private readonly clientsRepository: Repository<Clients>,
    private jwtService: JwtService
  ) {
    this.clientsRepository.save({
      id: 0,
      clientId: 'test',
      clientSecret: 'test',
      type: 'admin',
      didId: 'did:web:localhost%3A3000'
    })
  }

  async validateUser(id: string, secret: string): Promise<Clients | null> {
    const client = await this.clientsRepository.findOne({select: {
      clientId: true,
      type: true,
      didId: true
    }, where: {clientId: id, clientSecret: secret}});
    return client;
  }

  async validateToken(token: string): Promise<Clients | null> {
    const client = await this.clientsRepository.findOne({select: {
      clientId: true,
      type: true,
      didId: true
    }, where: {clientId: token}});
    return client;
  }

  async login(client: Clients) {
    const {clientSecret, ...clientDetail} = client;
    return {
      access_token: this.jwtService.sign(clientDetail)
    }
  }
}