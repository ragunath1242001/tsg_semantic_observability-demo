import { Test, TestingModule } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { InitClientConfig, RootConfig } from "../config.js";
import { ClientsService } from "./client.service.js";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { Clients } from "../model/clients.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailService } from "./mail.service.js";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, beforeAll, afterAll, it, jest } from '@jest/globals'
import { AppRole, ClientSignup } from "@libs/dtos";

const sendMailMock = jest.fn(); 
jest.mock("nodemailer");
const nodemailer = require("nodemailer");
nodemailer.createTransport.mockReturnValue({"sendMail": sendMailMock});

describe("Client Service", () => {
  let clientsService: ClientsService
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
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
    await clientsService.initialized;
    const initClients = plainToInstance(InitClientConfig, [
      {
        id: 'init-1',
        email: 'init-1@test.com',
        secret: 'testsecret',
        didId: 'did:web:test.com'
      },
      {
        id: 'init-2',
        email: 'init-1@test.com',
        secret: '$2a$12$HqB8QXE/iIpFdWl0x4W4Bey7judBWSfJQ1nIkqS1CxGUvMP1h/BdK'
      }
    ]);
    await clientsService.init(initClients);
  })

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  })

  describe("Client CRUD", () => {
    const clientId = 'test@test.com';
    
    it("Client Create", async () => {
      await expect(clientsService.signup({} as ClientSignup)).rejects.toThrow('Missing information for signup')
      await expect(clientsService.signup({
        email: 'init-1',
        secret: 'testsecret',
        didId: 'did:web:test.com'
      })).rejects.toThrow('already exists')
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

      await expect(clientsService.verify('', '')).rejects.toThrow('Incorrect data');
      await expect(clientsService.verify('', 'unknown-client')).rejects.toThrow('Incorrect data');
      await expect(clientsService.verify('incorrect-code', clientId)).rejects.toThrow('Expired or incorrect code');

      await clientsService.verify(code, clientId);

      await clientsService.signup({
        email: 'test-auto-activated@test.com',
        secret: 'testsecret',
        didId: 'did:web:test.com'
      }, true);

      const clients = await clientsService.getClients();
      expect(clients).toHaveLength(5);
    });

    it("Reset password", async () => {
      await clientsService.forgotPassword(clientId);

      const resetMail = (sendMailMock.mock.calls[1][0] as any).text;
      expect(resetMail).toBeDefined();
      const forgotMatch = resetMail.match(/forgot=(?<forgot>[0-9a-z]+)/) as {groups: Record<string, string>} | null;
      expect(forgotMatch).toBeDefined();
      const forgot = forgotMatch!.groups['forgot'];

      await expect(clientsService.resetPassword({clientId: '', old: '', new: ''})).rejects.toThrow('Incorrect data');
      await expect(clientsService.resetPassword({clientId: 'unknown-client', old: '', new: ''})).rejects.toThrow('Incorrect data');
      await expect(clientsService.resetPassword({clientId: clientId, old: 'incorred-code', new: ''})).rejects.toThrow('Incorrect data');

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

      const minimalClient = await clientsService.getMinimalClient(clientId);
      expect(minimalClient).toEqual(client);

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
      expect(clients).toHaveLength(4);

      await expect(clientsService.remove(clientId)).rejects.toThrow('not found')
    })

  })
})