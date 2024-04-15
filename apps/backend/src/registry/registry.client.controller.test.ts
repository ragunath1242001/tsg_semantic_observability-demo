import { Test, TestingModule } from "@nestjs/testing";
import { RegistryClientService } from "./registry.client.service";
import { RegistryClientController } from "./registry.client.controller";

describe("RegistryController", () => {
  let controller: RegistryClientController;
  const registryClientService = {
    requestAddresses: jest.fn(),
    requestCatalogs: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistryClientController],
      providers: [
        {
          provide: RegistryClientService,
          useValue: registryClientService,
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
