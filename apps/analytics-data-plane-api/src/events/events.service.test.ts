import { EventEmitterModule } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UIElementType } from "@tsg-dsp/analytics-data-plane-dtos";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ControlPlaneConfig,
  DataPlaneError,
  DataPlaneRegistrationService,
  DataPlaneStateDao,
  ITransferHandler,
  NegotiationClientService,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import {
  createDataPlaneHttpMocks,
  createDataPlaneManagementHttpMocks,
  createDidConnectorHttpMocks
} from "@tsg-dsp/common-data-plane-api/testing";
import { TransferState } from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { HttpResponse } from "msw";
import { http } from "msw/core/http";
import { SetupServer, setupServer } from "msw/node";
import { vi } from "vitest";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { SplitModeService } from "../bridge/split-mode/split-mode.service.js";
import { RootConfig } from "../config.js";
import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { DatasetDao } from "../dataplane/dataset.dao.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import {
  ProjectAgreementCallbackDao,
  ProjectAgreementDao
} from "../project-agreements/project-agreement.dao.js";
import { ProjectAgreementsService } from "../project-agreements/project-agreements.service.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { EventsGateway } from "./events.gateway.js";
import { EventsService } from "./events.service.js";
import { InternalEventDao } from "./internal-event.dao.js";

describe("EventsService", () => {
  let server: SetupServer;
  const TRANSFER_ID = "urn:uuid:16228d2e-5662-4961-bf2c-d929f48a7f3f";
  const REMOTE_PARTY_ID = "did:web:remoteparty";
  const ALGORITHM_EVENT_ID = "urn:uuid:16a3b006-faa7-41fb-bffd-55d900a1ee0f";
  const JOB_ALGORITHM_EVENT_ID =
    "urn:uuid:94d26207-f86e-47d0-966f-b0869ec29f02";
  const INTERNAL_EVENT_ID = "urn:uuid:875451b2-21f2-42c1-abbe-c30588f64ef8";

  let algorithmInstanceId: string;
  let eventsAccessToken: string;
  let eventsService: EventsService;
  let algorithmInstancesService: AlgorithmInstancesService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        initializationDelay: 1
      },
      logging: {
        debug: true
      }
    });

    server = setupServer(
      ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint),
      ...createDataPlaneManagementHttpMocks(
        config.controlPlane.managementEndpoint
      ),
      ...createDidConnectorHttpMocks(),
      http.post(
        `http://localhost:3000/data-address/events/:instanceId/algorithm-event`,
        () => {
          return HttpResponse.text();
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao,
          DataPlaneStateDao,
          ProjectAgreementDao,
          ProjectAgreementCallbackDao,
          DatasetDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao,
          DataPlaneStateDao,
          ProjectAgreementDao,
          ProjectAgreementCallbackDao,
          DatasetDao
        ])
      ],
      providers: [
        EventsService,
        AlgorithmInstancesService,
        AuthClientService,
        DataPlaneRegistrationService,
        CatalogClientService,
        NegotiationClientService,
        TransferClientService,
        {
          provide: BridgeWsClientService,
          useValue: {
            emit: vi.fn(),
            on: vi.fn()
          }
        },
        {
          provide: EventsGateway,
          useValue: {
            sendUpdateToClients: vi.fn()
          }
        },
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ControlPlaneConfig,
          useValue: config.controlPlane
        },
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: ITransferHandler,
          useClass: AnalyticsTransferHandler
        },
        {
          provide: ProjectAgreementsService,
          useValue: {
            findById: (id: number) =>
              Promise.reject(
                new DataPlaneError(
                  `Project Agreement with id ${id} not found`,
                  404
                )
              )
          }
        },
        SplitModeService
      ]
    }).compile();
    await moduleRef.init();

    eventsService = moduleRef.get(EventsService);
    algorithmInstancesService = moduleRef.get(AlgorithmInstancesService);
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  it("should create an algorithm instance", async () => {
    // Mock the distribution method to avoid actual HTTP calls
    vi.spyOn(
      algorithmInstancesService,
      "distributeAlgorithmInstance"
    ).mockResolvedValue();
    const algorithmInstance =
      await algorithmInstancesService.createAlgorithmInstance({
        id: "test-instance-id",
        algorithmDefinition: {
          title: "Test Algorithm Instance",
          description: "This is a test algorithm instance",
          keywords: ["test", "algorithm"],
          image:
            "registry.gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/adp-test-image:latest",
          algorithmEvents: [
            {
              name: "test-event",
              description: "This is a test event",
              type: "json"
            }
          ],
          roleDefinitions: [
            {
              name: "participant",
              cardinality: {
                min: 1
              },
              states: [{ name: "test" }],
              communicatesToRoles: ["participant"]
            }
          ],
          internalEvents: [
            {
              name: "test-internal-event",
              description: "This is a test event",
              type: "counter"
            }
          ],
          uiTemplate: [
            {
              metric: "test-internal-event",
              description: "This is a test UI element",
              type: UIElementType.FIELD
            }
          ]
        },
        participants: [
          {
            didId: "did:web:localhost",
            role: "participant",
            dataset: "urn:uuid:30b95804-685d-4f53-9903-8581d6e5b21d"
          },
          {
            didId: "did:web:remoteparty",
            role: "participant",
            dataset: "urn:uuid:b00ccdb5-11f1-4b2a-b132-8ee78dc418e8"
          },
          {
            didId: "did:web:remoteparty2",
            role: "participant",
            dataset: "urn:uuid:652c71d1-81c5-4b42-9ed0-6f6d75f30b31"
          }
        ]
      });

    expect(algorithmInstance).toBeDefined();
    expect(algorithmInstance.id).toBeDefined();
    expect(algorithmInstance.algorithmDefinition.title).toBe(
      "Test Algorithm Instance"
    );

    algorithmInstanceId = algorithmInstance.id;
  });

  it("should create an internal event", async () => {
    const EVENT_NUMBER = 1;
    const EVENT_TIMESTAMP = new Date().toISOString();
    const event = await eventsService.createInternalEvent({
      algorithmInstanceId: algorithmInstanceId,
      createInternalEvent: {
        id: INTERNAL_EVENT_ID,
        name: "Test Internal Event",
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP
      }
    });

    expect(event).toBeDefined();
    expect(event.id).toBe(INTERNAL_EVENT_ID);
  });

  it("should create a job access token", async () => {
    eventsAccessToken =
      await algorithmInstancesService.createAccessToken(algorithmInstanceId);
  });

  it("should create a job algorithm event", async () => {
    const JOB_ALGORITHM_EVENT_ID =
      "urn:uuid:94d26207-f86e-47d0-966f-b0869ec29f02";
    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "Test Event";
    const EVENT_NUMBER = 1;
    const authorizationHeader = `Bearer ${eventsAccessToken}`;
    await eventsService["algorithmInstancesService"].linkTransfer({
      algorithmInstanceId,
      transfer: await eventsService["transferHandler"]![
        "transferRepository"
      ].save({
        id: TRANSFER_ID,
        remoteParty: REMOTE_PARTY_ID,
        processId: "test-process-id",
        datasetId: "urn:uuid:test",
        role: "consumer",
        state: TransferState.STARTED,
        request: {},
        response: {},
        dataAddress: {
          endpoint: "http://localhost:3000/data-address",
          endpointType: "tsg:HTTP",
          endpointProperties: [
            {
              name: "Authorization",
              value: "Bearer test-token",
              "@type": "EndpointProperty"
            }
          ]
        }
      })
    });
    const event = await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: JOB_ALGORITHM_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP,
        recipients: ["did:web:localhost", REMOTE_PARTY_ID]
      }
    });

    expect(event.eventId).toBe(JOB_ALGORITHM_EVENT_ID);
  });

  it("should upload event data", async () => {
    vi.spyOn(
      eventsService,
      "forwardEventDataToParticipant"
    ).mockResolvedValue();
    await eventsService.uploadAlgorithmEventData({
      algorithmInstanceId: algorithmInstanceId,
      eventId: JOB_ALGORITHM_EVENT_ID,
      eventData: Buffer.from("Test Event Data"),
      authorizationHeader: `Bearer ${eventsAccessToken}`
    });
  });

  it("should get event data", async () => {
    const data = await eventsService.getEventData({
      eventId: JOB_ALGORITHM_EVENT_ID,
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader: `Bearer ${eventsAccessToken}`
    });

    expect(data).toEqual(Buffer.from("Test Event Data"));
  });

  it("should create an algorithm event with recipients and trigger forwarding", async () => {
    // Mock the algorithmInstancesService to include participants
    vi.spyOn(
      eventsService["algorithmInstancesService"],
      "getAlgorithmInstance"
    ).mockResolvedValue({
      id: algorithmInstanceId!,
      participants: [
        {
          didId: "did:web:participant1",
          role: "participant",
          dataset: "dataset-1"
        },
        {
          didId: "did:web:participant2",
          role: "participant",
          dataset: "dataset-2"
        }
      ]
    } as any);
    await eventsService["algorithmInstancesService"].linkTransfer({
      algorithmInstanceId,
      transfer: await eventsService["transferHandler"]![
        "transferRepository"
      ].save({
        id: "transfer-1",
        remoteParty: "did:web:participant1",
        processId: "test-process-id",
        datasetId: "urn:uuid:test",
        role: "consumer",
        state: TransferState.STARTED,
        request: {},
        response: {},
        dataAddress: {
          endpoint: "http://localhost:3000/data-address",
          endpointType: "tsg:HTTP",
          endpointProperties: [
            {
              name: "Authorization",
              value: "Bearer test-token",
              "@type": "EndpointProperty"
            }
          ]
        }
      })
    });
    await eventsService["algorithmInstancesService"].linkTransfer({
      algorithmInstanceId,
      transfer: await eventsService["transferHandler"]![
        "transferRepository"
      ].save({
        id: "transfer-2",
        remoteParty: "did:web:participant2",
        processId: "test-process-id",
        datasetId: "urn:uuid:test",
        role: "consumer",
        state: TransferState.STARTED,
        request: {},
        response: {},
        dataAddress: {
          endpoint: "http://localhost:3000/data-address",
          endpointType: "tsg:HTTP",
          endpointProperties: [
            {
              name: "Authorization",
              value: "Bearer test-token",
              "@type": "EndpointProperty"
            }
          ]
        }
      })
    });

    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "Test Forwarded Event";
    const EVENT_NUMBER = 99;
    const RECIPIENTS = ["did:web:participant1", "did:web:participant2"];
    const authorizationHeader = `Bearer ${eventsAccessToken}`;

    const event = await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: "forwarded-event-id",
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP,
        recipients: RECIPIENTS
      }
    });

    expect(event).toBeDefined();
    expect(event.eventId).toBe("forwarded-event-id");
    expect(event.recipients).toEqual(RECIPIENTS);
  });

  it("should reject invalid recipients early during event creation", async () => {
    // Mock the algorithmInstancesService to return specific participants
    vi.spyOn(
      eventsService["algorithmInstancesService"],
      "getAlgorithmInstance"
    ).mockResolvedValue({
      id: algorithmInstanceId!,
      participants: [
        {
          didId: "did:web:participant1",
          role: "participant",
          dataset: "dataset-1"
        },
        {
          didId: "did:web:participant2",
          role: "participant",
          dataset: "dataset-2"
        }
      ]
    } as any);

    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "Test Invalid Recipients";
    const EVENT_NUMBER = 100;
    const INVALID_RECIPIENTS = ["did:web:invalid1", "did:web:invalid2"];
    const authorizationHeader = `Bearer ${eventsAccessToken}`;

    // Expect the creation to fail with invalid recipients
    await expect(
      eventsService.createAlgorithmEvent({
        algorithmInstanceId: algorithmInstanceId,
        authorizationHeader,
        createEvent: {
          eventId: "invalid-recipients-event",
          name: EVENT_NAME,
          number: EVENT_NUMBER,
          timestamp: EVENT_TIMESTAMP,
          recipients: INVALID_RECIPIENTS
        }
      })
    ).rejects.toThrow(
      "Invalid recipients: [did:web:invalid1, did:web:invalid2]"
    );
  });

  it("should create an algorithm event from another party", async () => {
    const ALGORITHM_EVENT_ID_2 = "algorithm-event-2";
    const EVENT_NAME = "Test Event";
    const EVENT_NUMBER = 2;
    const authorizationHeader = `Bearer FAKE_TOKEN`;
    await eventsService["algorithmInstancesService"].linkTransfer({
      algorithmInstanceId,
      transfer: await eventsService["transferHandler"]![
        "transferRepository"
      ].save({
        id: "transfer-1",
        remoteParty: "did:web:participant1",
        processId: "test-process-id",
        datasetId: "urn:uuid:test",
        role: "provider",
        secret: "FAKE_TOKEN",
        state: TransferState.STARTED,
        request: {},
        response: {},
        dataAddress: {
          endpoint: "http://localhost:3000/data-address",
          endpointType: "tsg:HTTP",
          endpointProperties: [
            {
              name: "Authorization",
              value: "Bearer FAKE_TOKEN",
              "@type": "EndpointProperty"
            }
          ]
        }
      })
    });
    await expect(
      eventsService.pollForAlgorithmEvent(algorithmInstanceId, undefined, 10)
    ).rejects.toThrow();
    const pollingListener = eventsService.pollForAlgorithmEvent(
      algorithmInstanceId,
      undefined,
      1000
    );
    const event = await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: ALGORITHM_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: new Date().toISOString()
      }
    });

    expect(event).toBeDefined();
    expect(event.eventId).toBe(ALGORITHM_EVENT_ID);
    await expect(pollingListener).resolves.toBeDefined();

    await expect(
      eventsService.pollForAlgorithmEvent(algorithmInstanceId, undefined, 10)
    ).resolves.toBeDefined();

    await expect(
      eventsService.pollForAlgorithmEvent(
        algorithmInstanceId,
        `${new Date(Date.now() + 1000).toISOString()}`,
        10
      )
    ).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const event2 = await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: ALGORITHM_EVENT_ID_2,
        name: EVENT_NAME,
        number: EVENT_NUMBER + 1,
        timestamp: new Date().toISOString()
      }
    });

    expect(event2).toBeDefined();
    expect(event2.eventId).toBe(ALGORITHM_EVENT_ID_2);

    const polledEvent = await eventsService.pollForAlgorithmEvent(
      algorithmInstanceId,
      undefined,
      10
    );
    expect(polledEvent).toBeDefined();
    expect(polledEvent.eventId).toBe(ALGORITHM_EVENT_ID);

    const polledEvent2 = await eventsService.pollForAlgorithmEvent(
      algorithmInstanceId,
      event.timestamp.toISOString(),
      10
    );
    expect(polledEvent2).toBeDefined();
    expect(polledEvent2.eventId).toBe(ALGORITHM_EVENT_ID_2);
  });

  it("should return event data for management when data exists", async () => {
    const buffer = await eventsService.getEventDataForManagement(
      algorithmInstanceId,
      JOB_ALGORITHM_EVENT_ID
    );
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer?.toString()).toBe("Test Event Data");
  });

  it("should return null event data for management when no data exists", async () => {
    vi.restoreAllMocks();
    const NEW_EVENT_ID = "urn:uuid:new-event-no-data";
    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "New Event No Data";
    const EVENT_NUMBER = 3;
    // Use remote party token so event is created as forwarded (isOwnEvent=false) and no recipients/forwarding takes place
    const authorizationHeader = `Bearer FAKE_TOKEN`;
    await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: NEW_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP
        // recipients intentionally omitted
      }
    });

    const buffer = await eventsService.getEventDataForManagement(
      algorithmInstanceId,
      NEW_EVENT_ID
    );

    expect(buffer).toBeNull();
  });
});
