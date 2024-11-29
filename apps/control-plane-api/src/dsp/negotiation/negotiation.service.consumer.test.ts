import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Agreement,
  AgreementDto,
  ContractAgreementMessage,
  ContractAgreementVerificationMessageDto,
  ContractNegotiationDto,
  ContractNegotiationEventMessage,
  ContractNegotiationState,
  ContractNegotiationTerminationMessage,
  ContractOfferMessage,
  ContractRequestMessageDto,
  defaultContext,
  Multilanguage,
  NegotiationEvent,
  ODRLAction,
  Offer
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { AuthService } from "../../auth/auth.service";
import { RootConfig, ServerConfig } from "../../config";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../../model/negotiation.dao";
import { TypeOrmTestHelper } from "../../utils/testhelper";
import { DspClientService } from "../client/client.service";
import { DspGateway } from "../client/dsp.gateway";
import { NegotiationService } from "./negotiation.service";
import { AgreementDao, TransferMonitorDao } from "../../model/agreement.dao";
import { TransferDetailDao, TransferEventDao } from "../../model/transfer.dao";
import { AgreementService } from "../../policy/agreement.service";
import { DSPClientError } from "../../utils/errors/error";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("Negotiation Service (Consumer)", () => {
  let negotiationService: NegotiationService;
  let agreementService: AgreementService;
  let server: SetupServer;
  let remoteProcessId = "urn:uuid:51532177-8ae0-4d24-839e-c7bc969ddcfd";

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, { iam: { type: "dev" } });
    const serverConfig = plainToClass(ServerConfig, {});

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          NegotiationDetailDao,
          NegotiationProcessEventDao,
          AgreementDao,
          TransferMonitorDao,
          TransferDetailDao,
          TransferEventDao
        ]),
        TypeOrmModule.forFeature([
          NegotiationDetailDao,
          NegotiationProcessEventDao,
          AgreementDao,
          TransferMonitorDao,
          TransferDetailDao,
          TransferEventDao
        ])
      ],
      providers: [
        NegotiationService,
        DspClientService,
        DspGateway,
        EventEmitter2,
        {
          provide: AuthService,
          useValue: new (class {
            async requestToken(audience: string) {
              return "TEST_TOKEN";
            }
            async validateToken(token: string, audience?: string) {
              return true;
            }
            async requestSignatureValidation(
              signedDocument: Record<string, any>
            ) {
              if (signedDocument.proof.error === true) {
                throw new DSPClientError(
                  "Could not validate document",
                  Error()
                );
              }
            }
          })()
        },
        AgreementService,
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ServerConfig,
          useValue: serverConfig
        }
      ]
    }).compile();

    server = setupServer(
      http.post<PathParams, ContractRequestMessageDto, ContractNegotiationDto>(
        "http://remoteparty.test/negotiation/request",
        async (ctx) => {
          return HttpResponse.json<ContractNegotiationDto>({
            "@context": defaultContext(),
            "@id": remoteProcessId,
            "@type": "dspace:ContractNegotiation",
            "dspace:consumerPid": (await ctx.request.json())[
              "dspace:consumerPid"
            ],
            "dspace:providerPid": remoteProcessId,
            "dspace:state": ContractNegotiationState.REQUESTED
          });
        }
      ),
      http.post<PathParams, ContractRequestMessageDto, ContractNegotiationDto>(
        `http://remoteparty.test/negotiation/${remoteProcessId}/request`,
        async (ctx) => {
          return HttpResponse.json<ContractNegotiationDto>({
            "@context": defaultContext(),
            "@id": remoteProcessId,
            "@type": "dspace:ContractNegotiation",
            "dspace:consumerPid": (await ctx.request.json())[
              "dspace:consumerPid"
            ],
            "dspace:providerPid": remoteProcessId,
            "dspace:state": ContractNegotiationState.REQUESTED
          });
        }
      ),
      http.post<PathParams, ContractAgreementVerificationMessageDto>(
        `http://remoteparty.test/negotiation/${remoteProcessId}/agreement/verification`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.post<PathParams, ContractAgreementVerificationMessageDto>(
        `http://remoteparty.test/negotiation/${remoteProcessId}/events`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      )
    );

    server.listen({
      onUnhandledRequest: "warn"
    });
    negotiationService = moduleRef.get(NegotiationService);
    await negotiationService["negotiationDetailRepository"].query(
      "PRAGMA foreign_keys = 0"
    );
    agreementService = moduleRef.get(AgreementService);
    await agreementService.storeAgreement(
      {
        "@type": "odrl:Agreement",
        "@id": "urn:uuid:00000000-0000-0000-0000-000000000000",
        "odrl:assigner": "did:web:localhost",
        "odrl:assignee": "did:web:remote.com",
        "dspace:timestamp": new Date("2024-08-01T12:00:00Z").toISOString(),
        "odrl:target": "urn:uuid:33147fb2-8896-4a53-983b-61000b6559b6",
        "odrl:permission": [
          {
            "@type": "odrl:Permission",
            "odrl:action": ODRLAction.USE
          }
        ]
      },
      "00000000-0000-0000-0000-000000000000"
    );
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Simple negotiation interactions", () => {
    let localProcessId: string;
    it("Retrieve initial negotiations", async () => {
      const negotiations = await negotiationService.getNegotiations();

      expect(negotiations).toHaveLength(0);
    });

    it("Request new negotiation", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0"
      });
      const negotiationDetail = await negotiationService.requestNew(
        offer,
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b",
        "http://remoteparty.test/negotiation",
        "did:web:remoteparty.test"
      );
      expect(negotiationDetail).toBeDefined();
      expect(negotiationDetail.remoteId).toBe(remoteProcessId);
      expect(negotiationDetail.remoteAddress).toBe(
        `http://remoteparty.test/negotiation/${remoteProcessId}`
      );
      expect(negotiationDetail.state).toBe(ContractNegotiationState.REQUESTED);
      expect(negotiationDetail.dataSet).toBe(
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      );
      localProcessId = negotiationDetail.localId;
    });

    it("Retrieve negotiation", async () => {
      const negotiations = await negotiationService.getNegotiations();
      expect(negotiations).toHaveLength(1);
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail).toBeDefined();
      const negotiationDto =
        await negotiationService.getNegotiationDto(localProcessId);
      expect(negotiationDto).toBeDefined();
      const negotiationDetail2 = await negotiationService.getNegotiation(
        localProcessId,
        "did:web:remoteparty.test"
      );
      expect(negotiationDetail2).toBeDefined();
      await expect(
        negotiationService.getNegotiation(
          localProcessId,
          "did:web:otherremoteparty.test"
        )
      ).rejects.toThrow("Cannot get negotiation with process ID");
      expect(negotiationDto).toBeDefined();
      await expect(
        negotiationService.getNegotiation(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        )
      ).rejects.toThrow("Cannot get negotiation with process ID");
      await expect(
        negotiationService.getNegotiationDto(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        )
      ).rejects.toThrow("Cannot get negotiation with process ID");
    });

    it("Unexpected transition", async () => {
      await expect(
        negotiationService.handleEvent(
          localProcessId,
          new ContractNegotiationEventMessage({
            consumerPid: localProcessId,
            providerPid: remoteProcessId,
            eventType: NegotiationEvent.FINALIZED
          }),
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow("cannot transition");
    });

    it("Handle contract agreement", async () => {
      const emitAsyncMock = jest.spyOn(
        negotiationService.eventEmitter,
        "emitAsync"
      );
      const agreement = new Agreement({
        id: "urn:uuid:73a9c260-01c1-4f2a-a29f-a7ea3b96e1f3",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        assignee: "urn:uuid:3721b819-d096-45d3-b397-8b9fdc312cf3",
        timestamp: new Date().toISOString(),
        target: "urn:uuid:urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const agreementHandling = await negotiationService.handleAgreement(
        localProcessId,
        new ContractAgreementMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          agreement: agreement
        }),
        "did:web:remoteparty.test"
      );
      expect(agreementHandling.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.AGREED);
      expect(emitAsyncMock).toHaveBeenCalledTimes(1);
    });

    it("Verify agreement", async () => {
      const verify = await negotiationService.verify(localProcessId);
      expect(verify.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.VERIFIED);
    });

    it("Finalize negotiation", async () => {
      await expect(
        negotiationService.handleEvent(
          localProcessId,
          new ContractNegotiationEventMessage({
            consumerPid: localProcessId,
            providerPid: remoteProcessId,
            eventType: NegotiationEvent.FINALIZED,
            hashedMessage: {
              "dspace:algorithm": "JsonWebSignature2020",
              "dspace:digest": '{"error": true}'
            }
          }),
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow("Signature validation failed for negotiation");
      await negotiationService.handleEvent(
        localProcessId,
        new ContractNegotiationEventMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          eventType: NegotiationEvent.FINALIZED,
          hashedMessage: {
            "dspace:algorithm": "JsonWebSignature2020",
            "dspace:digest": "{}"
          }
        }),
        "did:web:remoteparty.test"
      );
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.FINALIZED);
      expect(negotiationDetail.events.map((event) => event.state)).toEqual([
        "dspace:REQUESTED",
        "dspace:FINALIZED",
        "dspace:AGREED",
        "dspace:VERIFIED",
        "dspace:FINALIZED"
      ]);
    });
  });

  describe("Complex negotiation interactions", () => {
    let localProcessId: string;

    it("Request new negotiation", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0"
      });
      const negotiationDetail = await negotiationService.requestNew(
        offer,
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b",
        "http://remoteparty.test/negotiation",
        "did:web:remoteparty.test"
      );
      expect(negotiationDetail).toBeDefined();
      expect(negotiationDetail.remoteId).toBe(remoteProcessId);
      expect(negotiationDetail.remoteAddress).toBe(
        `http://remoteparty.test/negotiation/${remoteProcessId}`
      );
      expect(negotiationDetail.state).toBe(ContractNegotiationState.REQUESTED);
      expect(negotiationDetail.dataSet).toBe(
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      );
      localProcessId = negotiationDetail.localId;
    });

    it("Retrieve negotiation", async () => {
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail).toBeDefined();
      const negotiationDetail2 = await negotiationService.getNegotiation(
        localProcessId,
        "did:web:remoteparty.test"
      );
      expect(negotiationDetail2).toBeDefined();
      await expect(
        negotiationService.getNegotiation(
          localProcessId,
          "did:web:otherremoteparty.test"
        )
      ).rejects.toThrow("Cannot get negotiation with process ID");
      await expect(
        negotiationService.getNegotiation(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        )
      ).rejects.toThrow("Cannot get negotiation with process ID");
    });

    it("Unexpected transition", async () => {
      await expect(
        negotiationService.handleEvent(
          localProcessId,
          new ContractNegotiationEventMessage({
            consumerPid: localProcessId,
            providerPid: remoteProcessId,
            eventType: NegotiationEvent.FINALIZED
          }),
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow("cannot transition");
    });

    it("Handle contract offer", async () => {
      const offer = await negotiationService.handleOffer(
        localProcessId,
        new ContractOfferMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859"
          }),
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );
      expect(offer.status).toBe("OK");
    });

    it("Request new offer", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0"
      });
      const negotiationDetail = await negotiationService.requestExisting(
        offer,
        localProcessId
      );
      expect(negotiationDetail).toBeDefined();
    });

    it("Handle new contract offer", async () => {
      const offer = await negotiationService.handleOffer(
        localProcessId,
        new ContractOfferMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          offer: new Offer({
            id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
            assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859"
          }),
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );
      expect(offer.status).toBe("OK");
    });

    it("Accept contract offer", async () => {
      const accepted = await negotiationService.accept(localProcessId);
      expect(accepted.status).toBe("OK");
    });

    it("Handle contract agreement", async () => {
      const agreement = new Agreement({
        id: "urn:uuid:73a9c260-01c1-4f2a-a29f-a7ea3b96e1f4",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        assignee: "urn:uuid:3721b819-d096-45d3-b397-8b9fdc312cf3",
        timestamp: new Date().toISOString(),
        target: "urn:uuid:urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const agreementHandling = await negotiationService.handleAgreement(
        localProcessId,
        new ContractAgreementMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          agreement: agreement
        }),
        "did:web:remoteparty.test"
      );
      expect(agreementHandling.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.AGREED);
    });

    it("Verify agreement", async () => {
      const verify = await negotiationService.verify(localProcessId);
      expect(verify.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.VERIFIED);
    });

    it("Finalize negotiation", async () => {
      await negotiationService.handleEvent(
        localProcessId,
        new ContractNegotiationEventMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          eventType: NegotiationEvent.FINALIZED
        }),
        "did:web:remoteparty.test"
      );
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.FINALIZED);
    });
  });

  describe("Negotiation termination", () => {
    let localProcessId: string;

    it("Provider termination", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0"
      });
      const negotiationDetail = await negotiationService.requestNew(
        offer,
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b",
        "http://remoteparty.test/negotiation",
        "did:web:remoteparty.test"
      );
      expect(negotiationDetail).toBeDefined();
      expect(negotiationDetail.remoteId).toBe(remoteProcessId);
      expect(negotiationDetail.remoteAddress).toBe(
        `http://remoteparty.test/negotiation/${remoteProcessId}`
      );
      expect(negotiationDetail.state).toBe(ContractNegotiationState.REQUESTED);
      expect(negotiationDetail.dataSet).toBe(
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      );
      localProcessId = negotiationDetail.localId;

      const termination = await negotiationService.handleTermination(
        localProcessId,
        new ContractNegotiationTerminationMessage({
          consumerPid: localProcessId,
          providerPid: remoteProcessId,
          reason: [new Multilanguage("Request termination")],
          code: "PROVIDER_ERROR"
        }),
        "did:web:remoteparty.test"
      );
      expect(termination.status).toBe("OK");
    });

    it("Consumer termination", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0"
      });
      const negotiationDetail = await negotiationService.requestNew(
        offer,
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b",
        "http://remoteparty.test/negotiation",
        "did:web:remoteparty.test"
      );
      expect(negotiationDetail).toBeDefined();
      expect(negotiationDetail.remoteId).toBe(remoteProcessId);
      expect(negotiationDetail.remoteAddress).toBe(
        `http://remoteparty.test/negotiation/${remoteProcessId}`
      );
      expect(negotiationDetail.state).toBe(ContractNegotiationState.REQUESTED);
      expect(negotiationDetail.dataSet).toBe(
        "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      );
      localProcessId = negotiationDetail.localId;

      const termination = await negotiationService.terminate(
        localProcessId,
        "CONSUMER_ERROR",
        "Request termination"
      );
      expect(termination.status).toBe("OK");
    });
  });
});
