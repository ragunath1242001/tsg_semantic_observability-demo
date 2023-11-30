import { Test, TestingModule } from "@nestjs/testing"
import { DataPlaneController } from "./dataplane.controller"
import { ServerConfig } from "../config";
import { plainToClass } from "class-transformer";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogService } from "../dsp/catalog/catalog.service";


describe("DataPlaneController", () => {
  let dataPlaneController: DataPlaneController;
  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        CatalogService,
        {provide: ServerConfig, useValue: plainToClass(ServerConfig, {})}
      ]
    }).compile();

    dataPlaneController = moduleRef.get(DataPlaneController);
  });

  describe("/init", () => {
    it("Initialization of a new data plane should return 200", async () => {
      
    })
  })
})