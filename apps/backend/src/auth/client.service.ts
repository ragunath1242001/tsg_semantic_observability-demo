import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppRole, ClientInfo, ClientSignup, ResetPassword } from "@libs/dtos";
import { DeepPartial, Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { jwtSecrets } from "../utils/secrets.js";
import { Clients } from "../model/clients.dao.js";
import { AppError } from "../utils/error.js";
import { MailService } from "./mail.service.js";
import crypto from "crypto";
import { InitClientConfig, RootConfig } from "../config.js";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Clients)
    private readonly clientsRepository: Repository<Clients>,
    private readonly mail: MailService,
    private readonly jwtService: JwtService,
    private readonly config: RootConfig
  ) {
    this.didId = `did:web:${this.config.server.publicDomain.replace(
      ":",
      "%3A"
    )}`;
    this.initialized = this.init(config.initClients);
  }
  private readonly didId: string;
  initialized: Promise<boolean>;

  async init(initClients: InitClientConfig[]) {
    if (
      initClients.length === 0 &&
      (await this.clientsRepository.find({})).length === 0
    ) {
      const secret = crypto.randomBytes(32).toString("hex");
      this.upsertClient({
        clientId: "admin",
        clientSecret: bcrypt.hashSync(secret, 10),
        email: "noreply@dataspac.es",
        didId: this.didId,
        roles: [
          AppRole.VIEW_ALL_CREDENTIALS,
          AppRole.MANAGE_ALL_CREDENTIALS,
          AppRole.MANAGE_KEYS,
          AppRole.MANAGE_CLIENTS,
        ],
        verified: true,
      });
      this.logger.warn(
        "No initial clients configured, one admin client is created automatically:"
      );
      this.logger.warn("  clientId: admin");
      this.logger.warn(`  clientSecret: ${secret}`);
      this.logger.warn(
        "Please update your configuration for production environments with predefined client(s)"
      );
    } else {
      for (const initClient of initClients) {
        let secret: string;
        if (
          initClient.secret.match(/^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/g)
        ) {
          secret = initClient.secret;
        } else {
          secret = bcrypt.hashSync(initClient.secret, 10);
          this.logger.warn(
            `Secret for client ${initClient.id} configured in plain text`
          );
        }
        await this.upsertClient({
          clientId: initClient.id,
          clientSecret: secret,
          email: initClient.email,
          didId: initClient.didId || this.didId,
          roles: initClient.roles,
          verified: true,
        });
      }
    }
    return true;
  }

  private async upsertClient(clientInfo: DeepPartial<Clients>) {
    const client: DeepPartial<Clients> =
      (await this.clientsRepository.findOneBy({
        clientId: clientInfo.clientId,
      })) || {};
    await this.clientsRepository.save({
      ...client,
      ...clientInfo,
    });
  }

  private readonly logger = new Logger(this.constructor.name);

  async signup(
    clientSignup: ClientSignup,
    active: boolean = false
  ): Promise<Clients> {
    if (!clientSignup.email || !clientSignup.didId || !clientSignup.secret) {
      throw new AppError(
        `Missing information for signup`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "debug");
    }
    const client = await this.clientsRepository.findOneBy({
      clientId: clientSignup.email,
    });
    if (client) {
      throw new AppError(
        `Client with email address ${clientSignup.email} already exists`,
        HttpStatus.CONFLICT
      ).andLog(this.logger, "debug");
    }
    const newClient: DeepPartial<Clients> = {
      clientId: clientSignup.email,
      clientSecret: await bcrypt.hash(clientSignup.secret, 10),
      email: clientSignup.email,
      didId: clientSignup.didId,
      roles: [],
    };
    if (!active && this.config.mail) {
      newClient.verified = false;
      newClient.verificationCode = crypto.randomBytes(32).toString("hex");
      newClient.verificationExpiration = new Date(
        new Date().getTime() + 60 * 60 * 1000
      );
      await this.mail.sendMail({
        email: clientSignup.email,
        sender: `"${this.config.mail.title}" <${this.config.mail.smtp.from}>`,
        title: `${this.config.mail.dataspace} - Activate your account`,
        summary: `Activate your account for the ${this.config.mail.title}`,
        link: this.config.server.publicAddress,
        img: `${this.config.mail.logo}`,
        header: "Activate your account",
        content: [
          {
            paragraphs: [
              `An account has been created on the ${this.config.mail.title}`,
              "We need to validate your email address to activate your account. Click the following button to activate your account:",
            ],
          },
          {
            button: {
              url: `${
                this.config.server.publicAddress
              }/?action=verify&clientId=${encodeURIComponent(
                clientSignup.email
              )}&code=${newClient.verificationCode}`,
              text: "Activate my account",
            },
          },
        ],
        footer: `This email was sent to you by ${this.config.mail.title} because you signed up for an account. If you do not recognise this, you can safely ignore this email.`,
      });
    } else {
      newClient.verified = true;
    }
    return this.clientsRepository.save(newClient);
  }

  async forgotPassword(clientId: string): Promise<void> {
    if (!this.config.mail) {
      throw new AppError(
        `This server does not support resetting of passwords`,
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger, "debug");
    }
    const client = await this.getClient(clientId);
    client.verificationCode = crypto.randomBytes(32).toString("hex");
    client.verificationExpiration = new Date(
      new Date().getTime() + 60 * 60 * 1000
    );

    await this.mail.sendMail({
      email: clientId,
      sender: `"${this.config.mail.title}" <${this.config.mail.smtp.from}>`,
      title: `${this.config.mail.dataspace} - Reset password`,
      summary: `Reset your password for the ${this.config.mail.title}`,
      link: this.config.server.publicAddress,
      img: `${this.config.mail.logo}`,
      header: "Reset password",
      content: [
        {
          paragraphs: [
            `A request has been made to reset the password for your account on the ${this.config.mail.title}`,
            "Click the following button to reset your password:",
          ],
        },
        {
          button: {
            url: `${this.config.server.publicAddress}/?forgot=${
              client.verificationCode
            }&client=${encodeURIComponent(clientId)}`,
            text: "Reset password",
          },
        },
      ],
      footer: `This email was sent to you by ${this.config.mail.title} because you requested a reset of your password. If you do not recognise this, you can safely ignore this email.`,
    });

    await this.clientsRepository.save(client);
  }

  async getClient(
    clientId: string,
    verified: boolean = false
  ): Promise<Clients> {
    let client: Clients | null;
    if (verified) {
      client = await this.clientsRepository.findOneBy({
        clientId: clientId,
        verified: true,
      });
    } else {
      client = await this.clientsRepository.findOneBy({ clientId: clientId });
    }
    if (!client) {
      throw new AppError(
        `Client with id ${clientId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "debug");
    }
    return client;
  }

  async getClients(): Promise<Clients[]> {
    const clients = await this.clientsRepository.find({});
    return clients.map((client) => {
      client.clientSecret = "";
      client.refreshToken = "";
      return client;
    });
  }

  async updateDidId(didId: string, clientId: string) {
    const client = await this.getClient(clientId);
    client.didId = didId;
    await this.clientsRepository.save(client);
  }

  async addRole(role: AppRole, clientId: string) {
    const client = await this.getClient(clientId);
    client.roles = [...new Set([...client.roles, role])];
    await this.clientsRepository.save(client);
  }

  async removeRole(role: AppRole, clientId: string) {
    const client = await this.getClient(clientId);
    client.roles = client.roles.filter((r) => r !== role);
    await this.clientsRepository.save(client);
  }

  async activate(clientId: string) {
    const client = await this.getClient(clientId);
    client.verified = true;
    await this.clientsRepository.save(client);
  }

  async deactivate(clientId: string) {
    const client = await this.getClient(clientId);
    client.verified = false;
    await this.clientsRepository.save(client);
  }

  async remove(clientId: string) {
    const client = await this.getClient(clientId);
    await this.clientsRepository.softRemove(client);
  }

  async verify(code: string, clientId: string) {
    if (!clientId || clientId.trim().length === 0) {
      throw new AppError(`Incorrect data`, HttpStatus.BAD_REQUEST).andLog(
        this.logger,
        "debug"
      );
    }
    let client: Clients;
    try {
      client = await this.getClient(clientId);
    } catch (e) {
      throw new AppError("Incorrect data", HttpStatus.BAD_REQUEST).andLog(
        this.logger,
        "debug"
      );
    }
    if (
      client.verificationCode === code &&
      client.verificationExpiration &&
      client.verificationExpiration > new Date()
    ) {
      client.verified = true;
      client.verificationCode = undefined;
      client.verificationExpiration = undefined;
      await this.clientsRepository.save(client);
    } else {
      throw new AppError(
        `Expired or incorrect code`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "debug");
    }
  }

  async resetPassword(reset: ResetPassword) {
    if (!reset.clientId || reset.clientId.trim().length === 0) {
      throw new AppError(`Incorrect data`, HttpStatus.BAD_REQUEST).andLog(
        this.logger,
        "debug"
      );
    }
    let client: Clients;
    try {
      client = await this.getClient(reset.clientId);
    } catch (e) {
      throw new AppError("Incorrect data", HttpStatus.BAD_REQUEST).andLog(
        this.logger,
        "debug"
      );
    }
    if (
      (client.verificationCode === reset.old &&
        client.verificationExpiration &&
        client.verificationExpiration > new Date()) ||
      (await bcrypt.compare(reset.old, client.clientSecret))
    ) {
      client.clientSecret = await bcrypt.hash(reset.new, 10);
      client.verificationCode = undefined;
      client.verificationExpiration = undefined;
      this.clientsRepository.save(client);
    } else {
      throw new AppError(`Incorrect data`, HttpStatus.BAD_REQUEST).andLog(
        this.logger,
        "debug"
      );
    }
  }

  async signin(clientId: string, secret: string): Promise<ClientInfo | null> {
    try {
      const client = await this.getClient(clientId, true);
      if (await bcrypt.compare(secret, client?.clientSecret)) {
        return {
          sub: client.clientId,
          email: client.email,
          didId: client.didId,
          roles: client.roles,
        };
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  async getMinimalClient(clientId: string): Promise<ClientInfo | null> {
    const client = await this.getClient(clientId, true);
    return {
      sub: client.clientId,
      email: client.email,
      didId: client.didId,
      roles: client.roles,
    };
  }

  async validateRefreshToken(clientId: string, refreshToken: string) {
    let client: Clients;
    try {
      client = await this.getClient(clientId, true);
    } catch (e) {
      return null;
    }
    if (refreshToken === client.refreshToken) {
      return await this.login({
        sub: client.clientId,
        email: client.email,
        didId: client.didId,
        roles: client.roles,
      });
    }
    throw new ForbiddenException("Access denied");
  }

  async login(client: ClientInfo) {
    const refreshToken = this.jwtService.sign(client, {
      secret: jwtSecrets.refresh,
      expiresIn: "7d",
    });
    await this.clientsRepository.update(
      { clientId: client.sub },
      { refreshToken: refreshToken }
    );
    return {
      access_token: this.jwtService.sign(client, {
        secret: jwtSecrets.access,
        expiresIn: "15m",
      }),
      refresh_token: refreshToken,
    };
  }
}
