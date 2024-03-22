import { Test, TestingModule } from "@nestjs/testing";
import { RegistryController } from "./registry.controller";
import { RegistryService } from "./registry.service";
import {
  Catalog,
  DataService,
  Dataset,
  Distribution,
} from "../model/dsp/catalog/catalog";
import { ODRLAction, ODRLOperator } from "@tsg-dsp/common";
import { Multilanguage, Reference } from "../model/dsp/common";
import {
  Offer,
  Permission,
  Constraint,
} from "../model/dsp/negotiation/negotiation";

describe("RegistryController", () => {
  let controller: RegistryController;
  const registryService = {
    fetchAddresses: jest.fn(),
    getCatalogs: jest.fn(),
    saveToDatabase: jest.fn(),
    crawl: jest.fn(),
    getAllCatalogs: jest.fn(),
    requestCatalogs: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistryController],
      providers: [
        {
          provide: RegistryService,
          useValue: registryService,
        },
      ],
    }).compile();

    controller = module.get<RegistryController>(RegistryController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("Should return catalogs", async () => {
    const catalog = new Catalog({
      id: "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
      creator: "did:web:localhost",
      description: [new Multilanguage("Test connector")],
      publisher: "did:web:localhost",
      title: "Test Catalog",
      dataset: [
        new Dataset({
          id: "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
          title: "HTTPBin",
          hasPolicy: [
            new Offer({
              id: "urn:uuid:03be4d42-fde2-40b6-8351-185dbc174fb2",
              assigner: "did:web:localhost",
              permission: [
                new Permission({
                  action: ODRLAction.READ,
                  target: "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                  constraint: [
                    new Constraint({
                      leftOperand: "dspace:identity",
                      rightOperand: "dspace:sameDataSpace",
                      operator: ODRLOperator.IS_PART_OF,
                    }),
                  ],
                }),
              ],
            }),
          ],
          distribution: [
            new Distribution({
              id: "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
              accessService: [
                new DataService({
                  id: "urn:uuid:946b0e29-b006-430a-8e4d-ddf196104b67",
                  endpointURL: "http://localhost:3000/api",
                }),
              ],
              conformsTo: new Reference({
                id: "https://httpbin.org/spec.json",
              }),
              format: "dspace:HTTP",
              title: "Version 0.9.2",
            }),
          ],
        }),
      ],
      service: [
        new DataService({
          id: "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
          endpointDescription: "dspace:connector",
          endpointURL: "https://cp.localhost/control-plane",
        }),
      ],
    });

    jest.spyOn(registryService, "getAllCatalogs").mockReturnValue([catalog]);

    const result = await controller.getCatalogs();

    expect(registryService.getAllCatalogs).toHaveBeenCalled();
    expect(result).toEqual([await catalog.serialize()]);
  });

  it("Should call request catalog", async () => {
    const result = await controller.requestCatalogs();

    expect(registryService.requestCatalogs).toHaveBeenCalled();
  });
  it("Should call fetch addresses", async () => {
    const result = await controller.requestAddresses();

    expect(registryService.fetchAddresses).toHaveBeenCalled();
  });
});
