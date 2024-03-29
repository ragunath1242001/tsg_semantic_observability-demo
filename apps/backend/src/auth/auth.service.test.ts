import { SetupServer } from "msw/node";
import { IamConfig, RootConfig } from "../config";
import { AuthService } from "./auth.service";
import {
  mockWalletConfig,
  setupMockWalletServer,
} from "./wallets/wallet.util.test";
import { plainToInstance } from "class-transformer";

describe("Auth Service", () => {
  let server: SetupServer;
  let iamConfig: IamConfig;

  beforeAll(async () => {
    server = setupMockWalletServer();
    iamConfig = mockWalletConfig();
  });

  afterAll(async () => {
    server.close();
  });

  let authService: AuthService;
  beforeEach(() => {
    authService = new AuthService(
      plainToInstance(RootConfig, { iam: iamConfig })
    );
  });

  it("Request & validate token", async () => {
    const token = await authService.requestToken(iamConfig.didId);
    expect(token).toEqual(expect.any(String));

    const valid = await authService.validateToken(token);
    expect(valid).toBeDefined();
  });
});
