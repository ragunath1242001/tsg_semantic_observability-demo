import { Test, TestingModule } from "@nestjs/testing";
import { TransferController } from "./transfer.controller";
import { HttpStatus } from "@nestjs/common";
import { TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { Multilanguage } from "../../model/dsp/common";
import { rest } from "msw"; 
import { SetupServer, setupServer } from "msw/node";
import { DspClientService } from "../client/client.service";
import { TransferState } from "../../model/dsp/transfer/messages.dto";
import { Catalog } from "../../model/dsp/catalog/catalog";
import { ServerConfig } from "../../config";
import { plainToClass } from "class-transformer";
import { AuthService } from "../../auth/auth.service";
import { TransferService } from "./transfer.service";
import { DataPlaneService } from "../../data-plane/dataPlane.service";
import { CatalogService } from "../catalog/catalog.service";

describe("TransferController", () => {
  let transferController: TransferController;
  let transferService: TransferService;
  let dataPlaneService: DataPlaneService;

  let transferProviderUuid: string;
  let transferConsumerUuid: string;
  let server: SetupServer;

  beforeAll(async () => {
    server = setupServer(
      rest.post("http://127.0.0.1/data-plane/transfer/request/consumer", (req, res, ctx) => {
        return res(ctx.json({
          accepted: true,
          identifier: 'ABCDEFG',
          callbackAddress: "http://127.0.0.1/data-plane/transfer/callbacks/ABCDEFG"
        }))
      }),
      rest.post("http://127.0.0.1/data-plane/transfer/request/provider", (req, res, ctx) => {
        return res(ctx.json({
          accepted: true,
          identifier: 'ABCDEFG',
          callbackAddress: "http://127.0.0.1/data-plane/transfer/callbacks/ABCDEFG"
        }))
      }),
      rest.post("http://127.0.0.1/data-plane/transfer/ABCDEFG/:action", (req, res, ctx) => {
        return res(ctx.json({
          status: "OK"
        }))
      }),
      rest.get("http://127.0.0.1/data-plane/health", (req, res, ctx) => res()),
      rest.get("http://127.0.0.1/data-plane/catalog", async (req, res, ctx) => res(ctx.json(await new Catalog({}).serialize()))),
      rest.post("http://127.0.0.1/transfer/request", async (req, res, ctx) => {
        return res(ctx.json(
          await new TransferProcess({
            processId: 'urn:uuid:0cb31b6f-d38c-4e88-a329-4b9a2b2e0b61',
            transferState: TransferState.STARTED
          }).serialize()
        ))
      }),
      rest.post("http://127.0.0.1/transfer/callbacks/:id/:action", async (req, res, ctx) => {
        return res(ctx.json({
          status: 'OK'
        }))
      }),
      rest.post("http://127.0.0.1/transfer/:id/:action", async (req, res, ctx) => {
        return res(ctx.json({
          status: 'OK'
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
      providers: [
        TransferService, 
        DataPlaneService, 
        CatalogService, 
        DspClientService,
        {provide: ServerConfig, useValue: plainToClass(ServerConfig, {})}
      ],
    }).useMocker((token) => {
      if (token === AuthService) {
        return {
          requestToken() {return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU"},
          validateToken() {return true}
        }
      }
    }).compile();

    transferController = moduleRef.get(TransferController);
    transferService = moduleRef.get(TransferService);
    dataPlaneService = moduleRef.get(DataPlaneService);

    dataPlaneService.addDataPlane({
      dataplaneType: "dspace:HTTP",
      endpointPrefix: "",
      callbackAddress: "http://127.0.0.1/data-plane",
      managementAddress: "http://127.0.0.1/data-plane",
      managementToken: "DpuwVK9bnX2MVGf6MVVjlBnI4PvtQSGJ",
      catalogSynchronization: "push",
      role: "both"
    });

    const transferProviderProcess = await transferService.handleRequest(new TransferRequestMessage({
      agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
      format: "dspace:HTTP",
      callbackAddress:
        "http://127.0.0.1/transfer/callbacks/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
    }), 'did:web:localhost');
    transferProviderUuid = transferProviderProcess.processId
    const transferConsumerProcess = await transferService.initiateTransferProcess(
      'urn:uuid:urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099',
      'dspace:HTTP',
      undefined,
      "http://127.0.0.1/transfer/request", 
      'did:web:localhost'
    );
    transferConsumerUuid = transferConsumerProcess.localId;

  });


  describe("/request", () => {
    it("Contract request should return default contract transfer", async () => {
      const result = await transferController.request(
        new TransferRequestMessage({
          agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
          format: "dspace:HTTP",
          callbackAddress:
            "http://127.0.0.1/transfer/callbacks/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@type": "dspace:TransferProcess",
        "dspace:processId": expect.stringContaining("urn:uuid:"),
        "dspace:transferState": "dspace:REQUESTED",
      });
    });
  });

  describe("/:id", () => {
    it("Transfer request with known id should result the transfer", async () => {
      const result = await transferController.getTransfer(
        transferProviderUuid, 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@type": "dspace:TransferProcess",
        "dspace:processId": transferProviderUuid,
        "dspace:transferState": "dspace:REQUESTED",
      });
    });
    it("Transfer request with unknown id should result in a 404", () => {
      expect(async () => {
        await transferController.getTransfer(
          "urn:uuid:00000000-0000-0000-0000-000000000000", 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });


  describe("/:id/start", () => {
    it("Transfer start with specified identifier should return a status OK", async () => {
      await transferService.start(transferProviderUuid, undefined, true)
      await transferService.handleSuspend(
        transferProviderUuid,
        new TransferSuspensionMessage({
          processId: transferProviderUuid,
          reason: [new Multilanguage("Test")]
        }), 'did:web:localhost'
      )
      const result = await transferController.startTransferProcess(
        transferProviderUuid,
        new TransferStartMessage({
          processId: transferProviderUuid,
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/complete", () => {
    it("Transfer complete with specified identifier should return a status OK", async () => {
      await transferService.start(transferProviderUuid, undefined, true)

      const result = await transferController.completeTransferProcess(
        transferProviderUuid,
        new TransferCompletionMessage({
          processId: transferProviderUuid,
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
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
          }), 'did:web:localhost'
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
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/suspend", () => {
    it("Transfer suspend with specified identifier should return a status OK", async () => {
      await transferService.start(transferProviderUuid, undefined, true)
      
      const result = await transferController.suspendTransferProcess(
        transferProviderUuid,
        new TransferSuspensionMessage({
          processId: transferProviderUuid,
          reason: [
            new Multilanguage("Testing"),
          ],
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/callbacks/:id/start", () => {
    it("Transfer start with specified identifier should return a status OK", async () => {
      const result = await transferController.callbackStartTransferProcess(
        transferConsumerUuid,
        new TransferStartMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/:id/complete", () => {
    it("Transfer complete with specified identifier should return a status OK", async () => {
      await transferService.handleStart(
        transferConsumerUuid,
        new TransferStartMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6"
        }), 'did:web:localhost'
      )
      const result = await transferController.callbackCompleteTransferProcess(
        transferConsumerUuid,
        new TransferCompletionMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/:id/terminate", () => {
    it("Transfer terminate with specified identifier should return a status OK", async () => {
      const result = await transferController.callbackTerminateTransferProcess(
        transferConsumerUuid,
        new TransferTerminationMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
          code: "123:A",
          reason: [
            new Multilanguage("Testing"),
          ],
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/:id/suspend", () => {
    it("Transfer suspend with specified identifier should return a status OK", async () => {
      await transferService.handleStart(
        transferConsumerUuid,
        new TransferStartMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6"
        }), 'did:web:localhost'
      )
      const result = await transferController.callbackSuspendTransferProcess(
        transferConsumerUuid,
        new TransferSuspensionMessage({
          processId: "urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6",
          reason: [
            new Multilanguage("Testing"),
          ],
        }), 'did:web:localhost'
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
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
});
