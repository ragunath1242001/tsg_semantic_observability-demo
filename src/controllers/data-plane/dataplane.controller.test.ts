import { Test, TestingModule } from "@nestjs/testing"
import { DataPlaneController } from "./dataplane.controller"
import { ServicesModule } from "../../services/services.module";


describe("DataPlaneController", () => {
  let dataPlaneController: DataPlaneController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ServicesModule],
      controllers: [DataPlaneController]
    }).compile();

    dataPlaneController = moduleRef.get(DataPlaneController);
  });

  describe("/init", () => {
    it("Initialization of a new data plane should return 200", async () => {
      
    })
  })
})