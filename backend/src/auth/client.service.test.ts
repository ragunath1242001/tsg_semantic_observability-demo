import { Test, TestingModule } from "@nestjs/testing";
import { plainToClass } from "class-transformer";
import { RootConfig } from "../config.js";
import { ClientsService } from "./client.service.js";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { Clients } from "../model/clients.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailService } from "./mail.service.js";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, beforeAll, afterAll, it } from '@jest/globals'


describe("Client Service", () => {
  let clientsService: ClientsService
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, {})

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([Clients]),
        TypeOrmModule.forFeature([Clients])
      ],
      providers: [
        ClientsService,
        MailService,
        JwtService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    clientsService = moduleRef.get(ClientsService);
  })

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  })

  describe("Client CRUD", () => {

    it("Client Create", async () => {
      const client = await clientsService.signup({
        clientId: 'test',
        email: 'test@test.com',
        secret: 'testsecret',
        didId: 'did:web:test.com'
      }, true);

      expect(client).toBeDefined();

      const clients = await clientsService.getClients();

      expect(clients.length).toBe(2);
    })
  })
})