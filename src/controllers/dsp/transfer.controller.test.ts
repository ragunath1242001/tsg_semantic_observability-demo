import { Test, TestingModule } from "@nestjs/testing";
import { TransferController } from "./transfer.controller";
import { TransferProviderService } from "../../services/dsp/transferProvider.service";
import { HttpStatus } from "@nestjs/common";
import { TransferConsumerService } from "../../services/dsp/transferConsumer.service";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { Multilanguage } from "../../model/dsp/common";
import { DataPlaneService } from "../../services/dataPlane.service";
import { CatalogService } from "../../services/dsp/catalog.service";
import { rest } from "msw"; 
import { SetupServer, setupServer } from "msw/node";

describe("TransferController", () => {
  let transferController: TransferController;
  let transferProviderService: TransferProviderService;
  let transferConsumerService: TransferConsumerService;
  let dataPlaneService: DataPlaneService;

  let transferProviderUuid: string;
  let transferConsumerUuid: string;
  let server: SetupServer;

  beforeAll(async () => {
    server = setupServer(
      rest.post("http://127.0.0.1/transfer/request/consumer", (req, res, ctx) => {
        return res(ctx.json({
          accepted: true,
          identifier: 'ABCDEFG',
          callbackAddress: "http://127.0.0.1/transfer/callback/ABCDEFG"
        }))
      }),
      rest.post("http://127.0.0.1/transfer/request/provider", (req, res, ctx) => {
        return res(ctx.json({
          accepted: true,
          identifier: 'ABCDEFG',
          callbackAddress: "http://127.0.0.1/transfer/callback/ABCDEFG"
        }))
      }),
      rest.post("http://127.0.0.1/transfer/ABCDEFG/:action", (req, res, ctx) => {
        return res(ctx.json({
          status: "OK"
        }))
      })
    );
    
    server.listen({
      onUnhandledRequest: "bypass"
    });
  });

  afterAll(async () => {
    server.close();
  })

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [TransferProviderService, TransferConsumerService, DataPlaneService, CatalogService],
    }).compile();

    transferController = moduleRef.get(TransferController);
    transferProviderService = moduleRef.get(TransferProviderService);
    transferConsumerService = moduleRef.get(TransferConsumerService);
    dataPlaneService = moduleRef.get(DataPlaneService);

    dataPlaneService.addDataPlane({
      dataplaneType: "dspace:HTTP",
      endpointPrefix: "",
      callbackAddress: "http://127.0.0.1",
      managementAddress: "http://127.0.0.1",
      managementToken: "DpuwVK9bnX2MVGf6MVVjlBnI4PvtQSGJ",
      catalogSynchronization: "push",
      role: "both"
    });

    const transferProviderProcess = await transferProviderService.request(new TransferRequestMessage({
      agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
      format: "dspace:HTTP",
      callbackAddress:
        "http://127.0.0.1/transfer/callback/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
    }));
    transferProviderUuid = transferProviderProcess.processId
    const transferConsumerProcess = await transferConsumerService.initiateTransferProcess(new TransferRequestMessage({
      agreementId: 'urn:uuid:urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099',
      format: 'dspace:HTTP'
    }));
    transferConsumerUuid = transferConsumerProcess.internalId;

  });


  describe("/request", () => {
    it("Contract request should return default contract transfer", async () => {
      const statusResponseMock = {
        send: jest.fn((x) => x),
      };
      const responseMock = {
        status: jest.fn((x) => statusResponseMock),
        send: jest.fn((x) => x),
        setHeader: jest.fn((x, y) => {}),
      };
      const result = await transferController.request(
        new TransferRequestMessage({
          agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
          format: "dspace:HTTP",
          callbackAddress:
            "http://127.0.0.1/transfer/callback/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
        }),
        responseMock as any
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@type": "dspace:TransferProcess",
        "dspace:processId": expect.stringContaining("urn:uuid:"),
        "dspace:transferState": "dspace:STARTED",
      });
      expect(responseMock.setHeader.mock.calls[0]).toStrictEqual(["Location", expect.stringContaining("urn:uuid:")])
    });
  });

  describe("/:id", () => {
    it("Transfer request with known id should result the transfer", async () => {
      const result = await transferController.getTransfer(
        transferProviderUuid
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@type": "dspace:TransferProcess",
        "dspace:processId": transferProviderUuid,
        "dspace:transferState": "dspace:STARTED",
      });
    });
    it("Transfer request with unknown id should result in a 404", () => {
      expect(async () => {
        await transferController.getTransfer(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });


  describe("/:id/start", () => {
    it("Transfer start with specified identifier should return a status OK", async () => {
      await transferProviderService.suspendTransferProcess(
        transferProviderUuid,
        new TransferSuspensionMessage({
          processId: transferProviderUuid,
          reason: [new Multilanguage("Test")]
        })
      )
      const result = await transferController.startTransferProcess(
        transferProviderUuid,
        new TransferStartMessage({
          processId: transferProviderUuid,
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.startTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferStartMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.startTransferProcess(
          transferProviderUuid,
          new TransferStartMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/complete", () => {
    it("Transfer complete with specified identifier should return a status OK", async () => {
      const result = await transferController.completeTransferProcess(
        transferProviderUuid,
        new TransferCompletionMessage({
          processId: transferProviderUuid,
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.completeTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferCompletionMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.completeTransferProcess(
          transferProviderUuid,
          new TransferCompletionMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/terminate", () => {
    it("Transfer terminate with specified identifier should return a status OK", async () => {
      const result = await transferController.terminateTransferProcess(
        transferProviderUuid,
        new TransferTerminationMessage({
          processId: transferProviderUuid,
          code: "123:A",
          reason: [
            new Multilanguage("Testing"),
          ],
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.terminateTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferTerminationMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [
              new Multilanguage("Testing"),
            ],
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.terminateTransferProcess(
          transferProviderUuid,
          new TransferTerminationMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [
              new Multilanguage("Testing"),
            ],
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/suspend", () => {
    it("Transfer suspend with specified identifier should return a status OK", async () => {
      const result = await transferController.suspendTransferProcess(
        transferProviderUuid,
        new TransferSuspensionMessage({
          processId: transferProviderUuid,
          reason: [
            new Multilanguage("Testing"),
          ],
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.suspendTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferSuspensionMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [
              new Multilanguage("Testing"),
            ],
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.suspendTransferProcess(
          transferProviderUuid,
          new TransferSuspensionMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [
              new Multilanguage("Testing"),
            ],
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/callback/:id/start", () => {
    it("Transfer start with specified identifier should return a status OK", async () => {
      const result = await transferController.callbackStartTransferProcess(
        transferConsumerUuid,
        new TransferStartMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackStartTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferStartMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callback/:id/complete", () => {
    it("Transfer complete with specified identifier should return a status OK", async () => {
      await transferConsumerService.startTransferProcess(
        transferConsumerUuid,
        new TransferStartMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6"
        })
      )
      const result = await transferController.callbackCompleteTransferProcess(
        transferConsumerUuid,
        new TransferCompletionMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackCompleteTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferCompletionMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callback/:id/terminate", () => {
    it("Transfer terminate with specified identifier should return a status OK", async () => {
      const result = await transferController.callbackTerminateTransferProcess(
        transferConsumerUuid,
        new TransferTerminationMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
          code: "123:A",
          reason: [
            new Multilanguage("Testing"),
          ],
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackTerminateTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferTerminationMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [
              new Multilanguage("Testing"),
            ],
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callback/:id/suspend", () => {
    it("Transfer suspend with specified identifier should return a status OK", async () => {
      await transferConsumerService.startTransferProcess(
        transferConsumerUuid,
        new TransferStartMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6"
        })
      )
      const result = await transferController.callbackSuspendTransferProcess(
        transferConsumerUuid,
        new TransferSuspensionMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
          reason: [
            new Multilanguage("Testing"),
          ],
        })
      );
      expect(result).toStrictEqual({
        status: 'OK'
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackSuspendTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferSuspensionMessage({
            processId: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [
              new Multilanguage("Testing"),
            ],
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
});
