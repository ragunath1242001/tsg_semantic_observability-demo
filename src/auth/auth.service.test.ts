import { SetupServer } from "msw/node";
import { IamConfig } from "../config";
import { AuthService } from "./auth.service";
import { mockWalletConfig, setupMockWalletServer } from "./wallets/wallet.mock.test";


describe('Auth Service', () => {
  let server: SetupServer;
  let iamConfig: IamConfig;
  
  beforeAll(async () => {
    server = setupMockWalletServer();
    iamConfig = mockWalletConfig();
  }); 

  afterAll(async () => {
    server.close();
  })

  let authService: AuthService
  beforeEach(() => {
    authService = new AuthService(iamConfig);
  })

  it("Request & validate token", async () => {
    const token = await authService.requestToken(iamConfig.didId);
    expect(token).toEqual(expect.any(String));

    const valid = await authService.validateToken(token);
    expect(valid).toStrictEqual(true);
  })
})