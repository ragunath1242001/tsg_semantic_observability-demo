import { Test, TestingModule } from "@nestjs/testing";
import { plainToClass } from "class-transformer";
import { RootConfig } from "../config.js";
import { ClientsService } from "./client.service.js";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { Clients } from "../model/clients.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailService } from "./mail.service.js";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, beforeAll, afterAll, it, jest } from '@jest/globals'
import { AppRole } from "../model/clients.dto.js";

const sendMailMock = jest.fn(); 
jest.mock("nodemailer");
const nodemailer = require("nodemailer");
nodemailer.createTransport.mockReturnValue({"sendMail": sendMailMock});

describe("Client Service", () => {
  let clientsService: ClientsService
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, {
      mail: {
        smtp: {
          host: "localhost",
          port: 465,
          secure: true,
          user: "test",
          password: "test",
          from: "test@test.com"
        },
        title: "Test",
        dataspace: "Test"
      }
    })
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
    const clientId = 'test@test.com';
    
    it("Client Create", async () => {
      const client = await clientsService.signup({
        email: clientId,
        secret: 'testsecret',
        didId: 'did:web:test.com'
      }, false);

      expect(client).toBeDefined();

      const signupMail = (sendMailMock.mock.calls[0][0] as any).text;
      expect(signupMail).toBeDefined();
      const codeMatch = signupMail.match(/code=(?<code>[0-9a-z]+)/) as {groups: Record<string, string>} | null;
      expect(codeMatch).toBeDefined();
      const code = codeMatch!.groups['code'];

      await clientsService.verify(code, clientId);

      const clients = await clientsService.getClients();
      expect(clients.length).toBe(2);
    });

    it("Reset password", async () => {
      await clientsService.forgotPassword(clientId);


      const resetMail = (sendMailMock.mock.calls[1][0] as any).text;
      expect(resetMail).toBeDefined();
      const forgotMatch = resetMail.match(/forgot=(?<forgot>[0-9a-z]+)/) as {groups: Record<string, string>} | null;
      expect(forgotMatch).toBeDefined();
      const forgot = forgotMatch!.groups['forgot'];

      await clientsService.resetPassword({
        clientId: clientId,
        old: forgot,
        new: 'testsecret'
      });
    });

    it("Update DID id", async () => {
      await clientsService.updateDidId('did:web:test-new.com', clientId);

      const client = await clientsService.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.didId).toBe('did:web:test-new.com');
    });

    it("Update roles", async () => {
      let client = await clientsService.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.roles.length).toBe(0);

      await clientsService.addRole(AppRole.ISSUE_CREDENTIALS, clientId);

      client = await clientsService.getClient(clientId);
      expect(client?.roles).toContain(AppRole.ISSUE_CREDENTIALS);

      await clientsService.removeRole(AppRole.ISSUE_CREDENTIALS, clientId);

      client = await clientsService.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.roles.length).toBe(0);
    });

    it("Client (de)activation", async () => {
      let client = await clientsService.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.verified).toBe(true);

      await clientsService.deactivate(clientId);

      client = await clientsService.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.verified).toBe(false);

      await clientsService.activate(clientId);
      
      client = await clientsService.getClient(clientId);
      expect(client).toBeDefined();
      expect(client?.verified).toBe(true);
    });

    it("Signin", async () => {
      const client = await clientsService.signin(clientId, 'testsecret');

      expect(client).toBeDefined();
      expect(client?.sub).toBe(clientId);
      expect(client?.email).toBe(clientId);
      expect(client?.didId).toBe('did:web:test-new.com');
      expect(client?.roles.length).toBe(0);

      expect(await clientsService.signin(clientId, 'incorrect-secret')).toBeNull();
      expect(await clientsService.signin('unknown-client', 'incorrect-secret')).toBeNull();
    });

    it("Tokens", async () => {
      const tokens = await clientsService.login({
        sub: clientId,
        email: clientId,
        didId: 'did:web:test-new.com',
        roles: []
      });

      expect(tokens).toBeDefined();
      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();

      const refreshedTokens = await clientsService.validateRefreshToken(clientId, tokens.refresh_token);
      expect(refreshedTokens).toBeDefined();
      expect(refreshedTokens?.access_token).toBeDefined();
      expect(refreshedTokens?.refresh_token).toBeDefined();

      expect(await clientsService.validateRefreshToken('unknown-client', '')).toBeNull();
      
      await expect(clientsService.validateRefreshToken(clientId, 'null')).rejects.toThrow('Access denied')
    });

    it("Client removal", async () => {
      await clientsService.remove(clientId);
      
      const clients = await clientsService.getClients();
      expect(clients.length).toBe(1);

      await expect(clientsService.remove(clientId)).rejects.toThrow('not found')
    })

  })
})