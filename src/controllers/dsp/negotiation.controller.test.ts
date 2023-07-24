import { Test, TestingModule } from "@nestjs/testing";
import { NegotiationController } from "./negotiation.controller";
import { NegotiationProviderService } from "../../services/negotiationProvider.service";
import { HttpStatus } from "@nestjs/common";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { Agreement, Offer } from "../../model/dsp/negotiation/negotiation";
import { NegotiationConsumerService } from "../../services/negotiationConsumer.service";
import { NegotiationEvent, ProofTypes } from "../../model/dsp/negotiation/messages.dto";
import { Multilanguage } from "../../model/dsp/common";

describe("NegotiationController", () => {
  let negotiationController: NegotiationController;
  let negotiationProviderService: NegotiationProviderService;
  let negotiationConsumerService: NegotiationConsumerService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NegotiationController],
      providers: [NegotiationProviderService, NegotiationConsumerService],
    }).compile();

    negotiationController = moduleRef.get(NegotiationController);
    negotiationProviderService = moduleRef.get(NegotiationProviderService);
    negotiationConsumerService = moduleRef.get(NegotiationConsumerService);
    
    await negotiationProviderService.request(new ContractRequestMessage({
      processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
      callbackAddress:
        "http://localhost/negotiation/callback/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
      offer: new Offer({
        id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
        assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
      }),
    }));
    await negotiationConsumerService.initiateNegotiationProcess({
      processId: "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4"
    });
  });


  describe("/request", () => {
    it("Contract request should return default contract negotiation", async () => {
      const statusResponseMock = {
        send: jest.fn((x) => x),
      };
      const responseMock = {
        status: jest.fn((x) => statusResponseMock),
        send: jest.fn((x) => x),
        setHeader: jest.fn((x, y) => {}),
      };
      const result = await negotiationController.request(
        new ContractRequestMessage({
          callbackAddress:
            "http://localhost/negotiation/callback/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
          }),
        }),
        responseMock as any
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": "urn:uuid:09b15239-8775-4de3-8441-c0d2b59cdf54",
        "@type": "dspace:ContractNegotiation",
        "dspace:contractNegotiationState": "dspace:OFFERED",
        "dspace:processId": "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
      });
      expect(responseMock.setHeader.mock.calls[0]).toStrictEqual(["Location", "/negotiation/urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085"])
    });
  });

  describe("/:id", () => {
    it("Negotiation request with known id should result the negotiation", async () => {
      const result = await negotiationController.getNegotiation(
        "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c"
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": "urn:uuid:09b15239-8775-4de3-8441-c0d2b59cdf54",
        "@type": "dspace:ContractNegotiation",
        "dspace:contractNegotiationState": "dspace:OFFERED",
        "dspace:processId": "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
      });
    });
    it("Negotiation request with unknown id should result in a 404", () => {
      expect(async () => {
        await negotiationController.getNegotiation(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });


  describe("/:id/request", () => {
    it("Contract request should with specified identifier return default contract negotiation", async () => {
      const result = await negotiationController.requestWithId(
        "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
        new ContractRequestMessage({
          processId: "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          callbackAddress:
            "http://localhost/negotiation/callback/urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
          }),
        })
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": "urn:uuid:09b15239-8775-4de3-8441-c0d2b59cdf54",
        "@type": "dspace:ContractNegotiation",
        "dspace:contractNegotiationState": "dspace:OFFERED",
        "dspace:processId": "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
      });
    });
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await negotiationController.requestWithId(
          "urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
          new ContractRequestMessage({
            callbackAddress:
              "http://localhost/negotiation/callback/urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
            offer: new Offer({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            }),
          })
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
            processId: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
            callbackAddress:
              "http://localhost/negotiation/callback/urn:uuid:5d9c9c88-a86a-47b7-9ade-72913afda5e2",
            offer: new Offer({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            }),
          })
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });

    describe("/:id/events", () => {
      it("Contract negotiation event should with specified identifier return a status OK", async () => {
        const result = await negotiationController.negotiationEvent(
          "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
          new ContractNegotiationEventMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            eventType: NegotiationEvent.ACCEPTED
          })
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
              processId: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
              eventType: NegotiationEvent.ACCEPTED
            })
          );
        }).rejects.toThrowError(
          expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
        );
      });
    });
    describe("/:id/agreement/verification", () => {
      it("Contract agreement verification should with specified identifier return a status OK", async () => {
        await negotiationProviderService.negotiationEvent(
          "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
          new ContractNegotiationEventMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            eventType: NegotiationEvent.ACCEPTED
          })
        )
        const result = await negotiationController.agreementVerification(
          "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
          new ContractAgreementVerificationMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            credentialSubject: {
              'dspace:hash': '0e3e75234abc68f4378a86b3f4b32a198ba301845b0cd6e50106e874345700cc6663a86c1ea125dc5e92be17c98f9a0f85ca9d5f595db2012f7cc3571945c123'
            },
            proof: {
              '@type': ProofTypes.Ed25519Signature2020,
              "dct:created": "2023-07-21T09:26:00Z",
              "sec:jws": "z3MvGcVxzRzzpKF1HA11EjvfPZsN8NAb7kXBRfeTm3CBg2gcJLQM5hZNmj6Ccd9Lk4C1YueiFZvkSx4FuHVYVouQk"
            }
          })
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
              processId: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
              credentialSubject: {
                'dspace:hash': '0e3e75234abc68f4378a86b3f4b32a198ba301845b0cd6e50106e874345700cc6663a86c1ea125dc5e92be17c98f9a0f85ca9d5f595db2012f7cc3571945c123'
              },
              proof: {
                '@type': ProofTypes.Ed25519Signature2020,
                "dct:created": "2023-07-21T09:26:00Z",
                "sec:jws": "z3MvGcVxzRzzpKF1HA11EjvfPZsN8NAb7kXBRfeTm3CBg2gcJLQM5hZNmj6Ccd9Lk4C1YueiFZvkSx4FuHVYVouQk"
              }
            })
          );
        }).rejects.toThrowError(
          expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
        );
      });
    });
    describe("/:id/termination", () => {
      it("Contract termination should with specified identifier return a status OK", async () => {
        const result = await negotiationController.negotiationTermination(
          "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
          new ContractNegotiationTerminationMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            reason: [
              new Multilanguage("Termination test")
            ]
          })
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
              processId: "urn:uuid:e8f94bf2-c59d-48c8-b5b9-9d5366ae2f3d",
              eventType: NegotiationEvent.ACCEPTED
            })
          );
        }).rejects.toThrowError(
          expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
        );
      });
    });
    describe("/callbacks/:id/offer", () => {
      it("Callback with a contract offer should return a status OK", async () => {
        const result = await negotiationController.callbackOffer(
          "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4",
          new ContractOfferMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            callbackAddress: 'http://localhost/negotiation/callback/urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c',
            offer: new Offer({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
            }),
          })
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
              processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
              callbackAddress: 'http://localhost/negotiation/callback/urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c',
              offer: new Offer({
                id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
                assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
              }),
            })
          )
        }).rejects.toThrowError(
          expect.objectContaining({ status: HttpStatus.NOT_FOUND })
        );
      });
    });
    describe("/callbacks/:id/agreement", () => {
      it("Callback with a contract agreement should return a status OK", async () => {
        const result = await negotiationController.callbackAgreement(
          "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4",
          new ContractAgreementMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            agreement: new Agreement({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
              assignee: "urn:uuid:05da26f1-6213-4c27-b104-623cd33ecde7",
              consumerId: "urn:uuid:ce2c234a-09e4-4cfd-bb44-3f94b925f18d",
              providerId: "urn:uuid:d5da1d7e-8d62-4579-8bb8-d092fe9a53ea",
              timestamp: "2023-07-21T09:26:00Z"
            })
          })
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
              processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
              agreement: new Agreement({
                id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
                assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
                assignee: "urn:uuid:05da26f1-6213-4c27-b104-623cd33ecde7",
                consumerId: "urn:uuid:ce2c234a-09e4-4cfd-bb44-3f94b925f18d",
                providerId: "urn:uuid:d5da1d7e-8d62-4579-8bb8-d092fe9a53ea",
                timestamp: "2023-07-21T09:26:00Z"
              })
            })
          )
        }).rejects.toThrowError(
          expect.objectContaining({ status: HttpStatus.NOT_FOUND })
        );
      });
    });
    describe("/callbacks/:id/event", () => {
      it("Callback with a contract event should return a status OK", async () => {
        await negotiationConsumerService.agreementCallback(
          "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4",
          new ContractAgreementMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            agreement: new Agreement({
              id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
              assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859",
              assignee: "urn:uuid:05da26f1-6213-4c27-b104-623cd33ecde7",
              consumerId: "urn:uuid:ce2c234a-09e4-4cfd-bb44-3f94b925f18d",
              providerId: "urn:uuid:d5da1d7e-8d62-4579-8bb8-d092fe9a53ea",
              timestamp: "2023-07-21T09:26:00Z"
            })
          })
        )
        const result = await negotiationController.callbackEvent(
          "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4",
          new ContractNegotiationEventMessage({
            processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
            eventType: NegotiationEvent.FINALIZED
          })
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
              processId: "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c",
              eventType: NegotiationEvent.ACCEPTED
            })
          )
        }).rejects.toThrowError(
          expect.objectContaining({ status: HttpStatus.NOT_FOUND })
        );
      });
    });
  });
});