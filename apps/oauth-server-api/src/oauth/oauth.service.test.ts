import { Test, TestingModule } from "@nestjs/testing";
import { OauthService } from "./oauth.service.js";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";
import { ServerConfig } from "@tsg-dsp/common-api";

describe("Oauth", () => {
  let provider: OauthService;

  beforeEach(async () => {
    const config = plainToInstance(ServerConfig, {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OauthService,
        {
          provide: ServerConfig,
          useValue: config
        }
      ]
    }).compile();

    provider = module.get<OauthService>(OauthService);
  });

  it("should be defined", () => {
    expect(provider).toBeDefined();
  });
});
