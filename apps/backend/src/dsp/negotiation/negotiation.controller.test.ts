import { Test, TestingModule } from "@nestjs/testing";
import { NegotiationController } from "./negotiation.controller";
import { HttpStatus } from "@nestjs/common";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { Agreement, Offer } from "../../model/dsp/negotiation/negotiation";
import { ContractNegotiationDto, ContractNegotiationState, ContractRequestMessageDto, NegotiationEvent } from "@tsg-dsp/common";
import { Multilanguage } from "../../model/dsp/common";
import { NegotiationService } from "./negotiation.service";
import { DspClientService } from "../client/client.service";
import { HttpResponse, PathParams, http } from "msw"; 
import { SetupServer, setupServer } from "msw/node";
import { IamConfig, ServerConfig } from "../../config";
import { plainToClass } from "class-transformer";
import { AuthService } from "../../auth/auth.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NegotiationDetailDao, NegotiationProcessEventDao } from "../../model/dsp/negotiation/negotiation.dao";
import { TypeOrmTestHelper } from "../../utils/testhelper";

describe("NegotiationController", () => {
  let negotiationController: NegotiationController;
  let negotiationService: NegotiationService;
  let providerNegotiationId: string;
  let consumerNegotiationId: string;
  let server: SetupServer;

  beforeAll(async () => {
    server = setupServer(
      http.post("http://127.0.0.1/negotiation/callbacks/:id/:action", () => {
        return HttpResponse.json({
          status: "OK"
        })
      }),
      http.post<PathParams, ContractRequestMessageDto, ContractNegotiationDto>("http://127.0.0.1/negotiation/request", async (ctx) => {
        return HttpResponse.json(
          await new ContractNegotiation({
            consumerPid: (await ctx.request.json())["dspace:consumerPid"],
            providerPid: 'urn:uuid:4486d6f5-aa10-45d3-b260-2f368dfca4e2',
            state: ContractNegotiationState.REQUESTED
          }).serialize()
        )
      }),
      http.post("http://127.0.0.1/negotiation/:id/:action", () => {
        return HttpResponse.json({
          status: "OK"
        })
      }),
    );
    
    server.listen({
      onUnhandledRequest: "error"
    });
  });

  afterAll(async () => {
    server.close();
  });
  
  beforeEach(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
          TypeOrmTestHelper.instance.module([NegotiationDetailDao, NegotiationProcessEventDao]),
          TypeOrmModule.forFeature([NegotiationDetailDao, NegotiationProcessEventDao])
      ],
      controllers: [NegotiationController],
      providers: [
        NegotiationService, 
        DspClientService,
        {provide: ServerConfig, useValue: plainToClass(ServerConfig, {})},
        {provide: IamConfig, useValue: plainToClass(IamConfig, {
          didId: 'did:web:localhost',
          tokenUrl: 'http://localhost/auth/login',
          presentationUrl: 'http://localhost/presentations',
          validationUrl: 'http://localhost/presentations/validate',
          clientId: 'client',
          clientSecret: 'secret',
          credentialId: 'did:web:localhost#00000000-0000-0000-0000-000000000000',
          validations: ['valid']
        })}
    ],
    }).useMocker((token) => {
      if (token === AuthService) {
        return {
          requestToken() {return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU"},
          validateToken() {return true}
        }
      }
    }).compile();

    negotiationController = moduleRef.get(NegotiationController);
    negotiationService = moduleRef.get(NegotiationService);

    
    const providerNegotiation =  await negotiationService.handleNewRequest(new ContractRequestMessage({
      consumerPid: 'urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0',
      callbackAddress:
        "http://127.0.0.1/negotiation/callbacks/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
      offer: new Offer({
        id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
        assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
        target: 'urn:uuid:0433ba4f-142d-494a-a7d0-74e3040ed4e6'
      }),
    }), 'did:web:localhost');
    providerNegotiationId = providerNegotiation.providerPid;
    const consumerNegotiation = await negotiationService.requestNew(
      new Offer({
        id: "urn:uuid:92928e7a-8f21-4489-adbd-d5800b7475a1",
        assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
      }),
      'urn:uuid:009c36f4-475c-43f0-88be-da23822f9c6d',
      "http://127.0.0.1/negotiation",
      'did:web:localhost'
    );
    consumerNegotiationId = consumerNegotiation.localId!;
  });

  afterEach(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });


  describe("/request", () => {
    it("Contract request should return default contract negotiation", async () => {
      const result = await negotiationController.request(
        new ContractRequestMessage({
          consumerPid: 'urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0',
          callbackAddress:
            "http://127.0.0.1/negotiation/callbacks/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            target: 'urn:uuid:0433ba4f-142d-494a-a7d0-74e3040ed4e6'
          }),
        }),
        'did:web:localhost'
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": expect.stringContaining("urn:uuid:"),
        "@type": "dspace:ContractNegotiation",
        "dspace:state": "dspace:REQUESTED",
        "dspace:providerPid": expect.stringContaining("urn:uuid:"),
        "dspace:consumerPid": "urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0"
      });
    });
  });

  describe("/:id", () => {
    it("Negotiation request with known id should result the negotiation", async () => {
      const result = await negotiationController.getNegotiation(providerNegotiationId, 'did:web:localhost');
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": expect.stringContaining("urn:uuid:"),
        "@type": "dspace:ContractNegotiation",
        "dspace:state": "dspace:REQUESTED",
        "dspace:providerPid": providerNegotiationId,
        "dspace:consumerPid": "urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0"
      });
    });
    it("Negotiation request with unknown id should result in a 404", () => {
      expect(async () => {
        await negotiationController.getNegotiation(
          "urn:uuid:00000000-0000-0000-0000-000000000000", 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });


  describe("/:id/request", () => {
    it("Contract request should with specified identifier return default contract negotiation", async () => {
      negotiationService["negotiationDetailRepository"].update({localId: providerNegotiationId}, {state: ContractNegotiationState.OFFERED});
      const result = await negotiationController.requestWithId(
        providerNegotiationId,
        new ContractRequestMessage({
          consumerPid: "urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0",
          providerPid: providerNegotiationId,
          callbackAddress:
            "http://127.0.0.1/negotiation/callbacks/urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            target: 'urn:uuid:0433ba4f-142d-494a-a7d0-74e3040ed4e6'
          }),
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": expect.stringContaining("urn:uuid:"),
        "@type": "dspace:ContractNegotiation",
        "dspace:state": "dspace:REQUESTED",
        "dspace:providerPid": providerNegotiationId,
        "dspace:consumerPid": "urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0"
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await negotiationController.requestWithId(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractRequestMessage({
            consumerPid: 'urn:uuid:a81bea31-55d4-4c70-b454-9758e1228fd0',
            callbackAddress:
              "http://127.0.0.1/negotiation/callbacks/urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
            offer: new Offer({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
              target: 'urn:uuid:0433ba4f-142d-494a-a7d0-74e3040ed4e6'
            }),
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await negotiationController.requestWithId(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractRequestMessage({
            consumerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            callbackAddress:
              "http://127.0.0.1/negotiation/callbacks/urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
            offer: new Offer({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
              target: 'urn:uuid:0433ba4f-142d-494a-a7d0-74e3040ed4e6'
            }),
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/events", () => {
    it("Contract negotiation event should with specified identifier return a status OK", async () => {
      negotiationService["negotiationDetailRepository"].update({localId: providerNegotiationId}, {state: ContractNegotiationState.OFFERED});
      const result = await negotiationController.negotiationEvent(
        providerNegotiationId,
        new ContractNegotiationEventMessage({
          consumerPid: 'urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d',
          providerPid: providerNegotiationId,
          eventType: NegotiationEvent.ACCEPTED
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await negotiationController.negotiationEvent(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractNegotiationEventMessage({
            consumerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            eventType: NegotiationEvent.ACCEPTED
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });
  describe("/:id/agreement/verification", () => {
    it("Contract agreement verification should with specified identifier return a status OK", async () => {
      negotiationService["negotiationDetailRepository"].update({localId: providerNegotiationId}, {state: ContractNegotiationState.AGREED});
      const result = await negotiationController.agreementVerification(
        providerNegotiationId,
        new ContractAgreementVerificationMessage({
          consumerPid: 'urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d',
          providerPid: providerNegotiationId,
          hashedMessage: {
            'dspace:algorithm': 'sha256',
            'dspace:digest': '...'
          }
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await negotiationController.agreementVerification(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractAgreementVerificationMessage({
            consumerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            hashedMessage: {
              'dspace:algorithm': 'sha256',
              'dspace:digest': '...'
            }
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });
  describe("/:id/termination", () => {
    it("Contract termination should with specified identifier return a status OK", async () => {
      const result = await negotiationController.negotiationTermination(
        providerNegotiationId,
        new ContractNegotiationTerminationMessage({
          consumerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
          providerPid: providerNegotiationId,
          reason: [
            new Multilanguage("Termination test")
          ]
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await negotiationController.negotiationEvent(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractNegotiationEventMessage({
            consumerPid: consumerNegotiationId,
            providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            eventType: NegotiationEvent.ACCEPTED
          }), 'did:web:localhost'
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });
  describe("/callbacks/:id/offer", () => {
    it("Callback with a contract offer should return a status OK", async () => {
      const result = await negotiationController.callbackOffer(
        consumerNegotiationId,
        new ContractOfferMessage({
          consumerPid: consumerNegotiationId,
          providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
          callbackAddress: `http://127.0.0.1/negotiation/callbacks/${consumerNegotiationId}`,
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            target: "urn:uuid:e9eeadef-a9cc-4b9c-ba57-fc182da03d63"
          }),
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Callback with a contract offer to an unknown identifier should return a 404", () => {
      expect(async () => {
        await negotiationController.callbackOffer(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractOfferMessage({
            consumerPid: consumerNegotiationId,
            providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            callbackAddress: 'http://127.0.0.1/negotiation/callbacks/urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c',
            offer: new Offer({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            }),
          }), 'did:web:localhost'
        )
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
  describe("/callbacks/:id/agreement", () => {
    it("Callback with a contract agreement should return a status OK", async () => {
      const result = await negotiationController.callbackAgreement(
        consumerNegotiationId,
        new ContractAgreementMessage({
          consumerPid: consumerNegotiationId,
          providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
          agreement: new Agreement({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            assignee: "urn:uuid:05da26f1-6213-4c27-b104-623cd33ecde7",
            timestamp: "2023-07-21T09:26:00Z",
            target: "urn:uuid:e9eeadef-a9cc-4b9c-ba57-fc182da03d63"
          })
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Callback with a contract agreement to an unknown identifier should return a 404", () => {
      expect(async () => {
        await negotiationController.callbackAgreement(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractAgreementMessage({
            consumerPid: consumerNegotiationId,
            providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            agreement: new Agreement({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
              assignee: "urn:uuid:05da26f1-6213-4c27-b104-623cd33ecde7",
              timestamp: "2023-07-21T09:26:00Z",
              target: "urn:uuid:e9eeadef-a9cc-4b9c-ba57-fc182da03d63"
            })
          }), 'did:web:localhost'
        )
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
  describe("/callbacks/:id/event", () => {
    it("Callback with a contract event should return a status OK", async () => {
      negotiationService["negotiationDetailRepository"].update({localId: consumerNegotiationId}, {state: ContractNegotiationState.VERIFIED});
      const result = await negotiationController.callbackEvent(
        consumerNegotiationId,
        new ContractNegotiationEventMessage({
          consumerPid: consumerNegotiationId,
          providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
          eventType: NegotiationEvent.FINALIZED
        }), 'did:web:localhost'
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Callback with a contract event to an unknown identifier should return a 404", () => {
      expect(async () => {
        await negotiationController.callbackEvent(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractNegotiationEventMessage({
            consumerPid: consumerNegotiationId,
            providerPid: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            eventType: NegotiationEvent.ACCEPTED
          }), 'did:web:localhost'
        )
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
});