import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ContractAgreementVerificationMessage,
  ContractAgreementVerificationMessageDto,
  ContractNegotiationEventMessage,
  ContractNegotiationState,
  ContractNegotiationTerminationMessage,
  ContractRequestMessage,
  Multilanguage,
  NegotiationEvent,
  ODRLAction,
  Offer
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { VCAuthService } from "../../vc-auth/vc.auth.service.js";
import { RootConfig } from "../../config.js";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../../model/negotiation.dao.js";
import { DspClientService } from "../client/client.service.js";
import { DspGateway } from "../client/dsp.gateway.js";
import { NegotiationService } from "./negotiation.service.js";
import { AgreementDao, TransferMonitorDao } from "../../model/agreement.dao.js";
import {
  TransferDetailDao,
  TransferEventDao
} from "../../model/transfer.dao.js";
import { AgreementService } from "../../policy/agreement.service.js";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  TypeOrmTestHelper,
  ServerConfig,
  PaginationOptionsDto
} from "@tsg-dsp/common-api";

describe("Negotiation Service (Provider)", () => {
  let negotiationService: NegotiationService;
  let agreementService: AgreementService;
  let server: SetupServer;
  const remoteProcessId = "urn:uuid:51532177-8ae0-4d24-839e-c7bc969ddcfd";

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, {
      iam: { type: "dev" },
      runtime: { controlPlaneInteractions: "automatic" }
    });
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
        EventEmitter2,
        DspGateway,
        {
          provide: VCAuthService,
          useValue: new (class {
            async requestToken() {
              return "TEST_TOKEN";
            }
            async validateToken() {
              return true;
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
      http.post<PathParams, ContractAgreementVerificationMessageDto>(
        `http://remoteparty.test/negotiation/${remoteProcessId}/offers`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.post<PathParams, ContractAgreementVerificationMessageDto>(
        `http://remoteparty.test/negotiation/${remoteProcessId}/agreement`,
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
    await negotiationService["negotiationDetailRepository"].query(
      "PRAGMA foreign_keys = 0"
    );
    await negotiationService["negotiationDetailRepository"].query(
      "PRAGMA ignore_check_constraints = 0"
    );
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Simple negotiation interactions", () => {
    let localProcessId: string;
    it("Retrieve initial negotiations", async () => {
      const negotiations = await negotiationService.getNegotiations(
        new PaginationOptionsDto()
      );

      expect(negotiations.total).toBe(0);
    });

    it("Handle new negotiation request", async () => {
      const emitAsyncMock = jest.spyOn(
        negotiationService.eventEmitter,
        "emitAsync"
      );

      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const negotiation = await negotiationService.handleNewRequest(
        new ContractRequestMessage({
          consumerPid: remoteProcessId,
          offer: offer,
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );

      expect(negotiation).toBeDefined();
      expect(negotiation.state).toBe(ContractNegotiationState.REQUESTED);
      localProcessId = negotiation.providerPid;

      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.REQUESTED);
      expect(emitAsyncMock).toHaveBeenCalledTimes(1);
    });

    it("Retrieve negotiation", async () => {
      const negotiations = await negotiationService.getNegotiations(
        new PaginationOptionsDto()
      );
      expect(negotiations.total).toBe(1);
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
            providerPid: localProcessId,
            consumerPid: remoteProcessId,
            eventType: NegotiationEvent.FINALIZED
          }),
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow("cannot transition");
    });

    it("Contract agreement", async () => {
      const agreement = await negotiationService.agree(localProcessId);
      expect(agreement.status).toBe("OK");

      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.AGREED);
    });

    it("Handle agreement verification", async () => {
      const emitAsyncMock = jest.spyOn(
        negotiationService.eventEmitter,
        "emitAsync"
      );
      const verification = await negotiationService.handleVerification(
        localProcessId,
        new ContractAgreementVerificationMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          hashedMessage: {
            "dspace:algorithm": "sha256",
            "dspace:digest": "..."
          }
        }),
        "did:web:remoteparty.test"
      );
      expect(verification.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.VERIFIED);
      expect(emitAsyncMock).toHaveBeenCalledTimes(1);
    });

    it("Finalize negotiation", async () => {
      const finalize = await negotiationService.finalize(localProcessId);
      expect(finalize.status).toBe("OK");
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

    it("Handle new negotiation request", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const negotiation = await negotiationService.handleNewRequest(
        new ContractRequestMessage({
          consumerPid: remoteProcessId,
          offer: offer,
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );
      expect(negotiation).toBeDefined();
      expect(negotiation.state).toBe(ContractNegotiationState.REQUESTED);
      localProcessId = negotiation.providerPid;

      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.REQUESTED);
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
            providerPid: localProcessId,
            consumerPid: remoteProcessId,
            eventType: NegotiationEvent.FINALIZED
          }),
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow("cannot transition");
    });

    it("Contract offer", async () => {
      const offer = await negotiationService.offer(
        new Offer({
          id: "urn:uuid:81a41b35-2926-4b29-8c9a-ee52665a047b",
          assigner: "urn:uuid:fcddc591-b9f1-4c75-b557-80d1cf955859"
        }),
        localProcessId,
        undefined
      );
      expect(offer.status).toBe("OK");
    });

    it("Handle new offer request", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });

      await expect(
        negotiationService.handleExistingRequest(
          localProcessId,
          new ContractRequestMessage({
            providerPid: remoteProcessId,
            consumerPid: localProcessId,
            offer: offer,
            callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
          }),
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow("Contract negotiation process ID mismatch");

      await negotiationService.handleExistingRequest(
        localProcessId,
        new ContractRequestMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          offer: offer,
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );
    });

    it("Offer new contract", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const offerResult = await negotiationService.offer(offer, localProcessId);
      expect(offerResult.status).toBe("OK");
    });

    it("Handle contract offer acceptance", async () => {
      const accept = await negotiationService.handleEvent(
        localProcessId,
        new ContractNegotiationEventMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          eventType: NegotiationEvent.ACCEPTED
        }),
        "did:web:remoteparty.test"
      );
      expect(accept.status).toBe("OK");
    });

    it("Contract agreement", async () => {
      const agreement = await negotiationService.agree(localProcessId);
      expect(agreement.status).toBe("OK");

      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.AGREED);
    });

    it("Hanlde agreement verification", async () => {
      const verification = await negotiationService.handleVerification(
        localProcessId,
        new ContractAgreementVerificationMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          hashedMessage: {
            "dspace:algorithm": "sha256",
            "dspace:digest": "..."
          }
        }),
        "did:web:remoteparty.test"
      );
      expect(verification.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.VERIFIED);
    });

    it("Finalize negotiation", async () => {
      const finalize = await negotiationService.finalize(localProcessId);
      expect(finalize.status).toBe("OK");
      const negotiationDetail =
        await negotiationService.getNegotiation(localProcessId);
      expect(negotiationDetail.state).toBe(ContractNegotiationState.FINALIZED);
    });
  });

  describe("Negotiation termination", () => {
    let localProcessId: string;

    it("Consumer termination", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const negotiation = await negotiationService.handleNewRequest(
        new ContractRequestMessage({
          consumerPid: remoteProcessId,
          offer: offer,
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );
      expect(negotiation).toBeDefined();
      expect(negotiation.state).toBe(ContractNegotiationState.REQUESTED);
      localProcessId = negotiation.providerPid;

      const termination = await negotiationService.handleTermination(
        localProcessId,
        new ContractNegotiationTerminationMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          reason: [new Multilanguage("Request termination")],
          code: "CONSUMER_ERROR"
        }),
        "did:web:remoteparty.test"
      );
      expect(termination.status).toBe("OK");
    });

    it("Provider termination", async () => {
      const offer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      const negotiation = await negotiationService.handleNewRequest(
        new ContractRequestMessage({
          consumerPid: remoteProcessId,
          offer: offer,
          callbackAddress: `http://remoteparty.test/negotiation/${remoteProcessId}`
        }),
        "did:web:remoteparty.test"
      );
      expect(negotiation).toBeDefined();
      expect(negotiation.state).toBe(ContractNegotiationState.REQUESTED);
      localProcessId = negotiation.providerPid;

      const termination = await negotiationService.terminate(
        localProcessId,
        "PROVIDER_ERROR",
        "Request termination"
      );
      expect(termination.status).toBe("OK");
    });
  });
});
