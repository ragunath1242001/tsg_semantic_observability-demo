import { Test, TestingModule } from "@nestjs/testing";
import { RegistryClientService } from "./registry.client.service";
import { RegistryClientController } from "./registry.client.controller";
import { plainToClass } from "class-transformer";
import { AuthConfig } from "../config";

describe("RegistryController", () => {
  let controller: RegistryClientController;
  const registryClientService = {
    requestAddresses: jest.fn(),
    requestCatalogs: jest.fn(),
  };
  beforeEach(async () => {
    const authConfig = plainToClass(AuthConfig, { enabled: false });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistryClientController],
      providers: [
        {
          provide: RegistryClientService,
          useValue: registryClientService,
        },
        {
          provide: AuthConfig,
          useValue: authConfig,
        },
      ],
    }).compile();

    controller = module.get(RegistryClientController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("Should call request catalog", async () => {
    const result = await controller.requestCatalogs();

    expect(registryClientService.requestCatalogs).toHaveBeenCalled();
  });
  it("Should call fetch addresses", async () => {
    const result = await controller.requestAddresses();

    expect(registryClientService.requestAddresses).toHaveBeenCalled();
  });
});
