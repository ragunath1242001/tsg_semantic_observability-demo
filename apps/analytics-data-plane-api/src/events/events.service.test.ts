import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UIElementType } from "@tsg-dsp/analytics-data-plane-dtos";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { RootConfig } from "../config.js";
import { DataPlaneStateDao } from "../dataplane/dataplane.dao.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { EventsService } from "./events.service.js";
import { InternalEventDao } from "./internal-event.dao.js";

describe("EventsService", () => {
  const TRANSFER_ID = "urn:uuid:16228d2e-5662-4961-bf2c-d929f48a7f3f";
  const REMOTE_PARTY_ID = "did:web:remoteparty1";
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

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ])
      ],
      providers: [
        {
          provide: DataPlaneService,
          useValue: {
            getTransferById: jest
              .fn<
                () => {
                  remoteParty: string;
                }
              >()
              .mockResolvedValue({
                id: TRANSFER_ID,
                remoteParty: REMOTE_PARTY_ID
              } as never),
            getTransferBySecret: jest
              .fn<
                () => {
                  remoteParty: string;
                }
              >()
              .mockResolvedValue({
                id: TRANSFER_ID,
                remoteParty: REMOTE_PARTY_ID
              } as never),
            getTransferByAlgorithmInstanceAndParty: jest
              .fn()
              .mockResolvedValue(null as never),
            forwardEventToParticipant: jest
              .fn()
              .mockResolvedValue(undefined as never),
            getParticipantId: () => "did:web:localhost"
          }
        },
        EventsService,
        AlgorithmInstancesService,
        AuthClientService,
        {
          provide: RootConfig,
          useValue: {
            controlPlane: {
              dataPlaneEndpoint: "http://127.0.0.1/data-plane",
              managementEndpoint: "http://localhost:3000/management",
              controlEndpoint: "http://localhost:3000",
              authorization: "Basic YWRtaW46YWRtaW4=",
              initializationDelay: 1
            }
          }
        },
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        }
      ]
    }).compile();

    eventsService = moduleRef.get(EventsService);
    algorithmInstancesService = moduleRef.get(AlgorithmInstancesService);
  });

  it("should create an algorithm instance", async () => {
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
    const event = await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: JOB_ALGORITHM_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP
      }
    });

    expect(event.eventId).toBe(JOB_ALGORITHM_EVENT_ID);
  });

  it("should upload event data", async () => {
    const event = await eventsService.uploadAlgorithmEventData({
      algorithmInstanceId: algorithmInstanceId,
      eventId: JOB_ALGORITHM_EVENT_ID,
      eventData: Buffer.from("Test Event Data"),
      authorizationHeader: `Bearer ${eventsAccessToken}`
    });

    expect(event).toBeDefined();
    expect(event.eventId).toBe(JOB_ALGORITHM_EVENT_ID);
    expect(event.data).toEqual(Buffer.from("Test Event Data"));
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
    // Mock the DataPlaneService methods for forwarding
    const mockTransfer1 = {
      id: "transfer-1",
      remoteParty: "did:web:participant1",
      secret: "test-secret-1",
      dataAddress: { endpoint: "http://participant1.example.com" }
    } as TransferDao;

    const mockTransfer2 = {
      id: "transfer-2",
      remoteParty: "did:web:participant2",
      secret: "test-secret-2",
      dataAddress: { endpoint: "http://participant2.example.com" }
    } as TransferDao;

    // Spy on the DataPlaneService methods
    const getTransferSpy = jest
      .spyOn(
        eventsService["dataPlaneService"],
        "getTransferByAlgorithmInstanceAndParty"
      )
      .mockImplementation(
        async (_algorithmInstanceId: string, remoteParty: string) => {
          if (remoteParty === "did:web:participant1") return mockTransfer1;
          if (remoteParty === "did:web:participant2") return mockTransfer2;
          return null;
        }
      );
    const forwardEventSpy = jest
      .spyOn(eventsService["dataPlaneService"], "forwardEventToParticipant")
      .mockResolvedValue(undefined);

    // Mock the algorithmInstancesService to include participants
    jest
      .spyOn(eventsService["algorithmInstancesService"], "getAlgorithmInstance")
      .mockResolvedValue({
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

    // Verify that forwarding methods were called
    expect(getTransferSpy).toHaveBeenCalledTimes(2);
    expect(getTransferSpy).toHaveBeenCalledWith(
      algorithmInstanceId,
      "did:web:participant1"
    );
    expect(getTransferSpy).toHaveBeenCalledWith(
      algorithmInstanceId,
      "did:web:participant2"
    );
    expect(forwardEventSpy).toHaveBeenCalledTimes(2);

    // Verify the forwarding calls had correct parameters
    expect(forwardEventSpy).toHaveBeenCalledWith(
      mockTransfer1,
      algorithmInstanceId,
      expect.objectContaining({
        eventId: "forwarded-event-id",
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: expect.any(String)
      }),
      authorizationHeader
    );
  });

  it("should reject invalid recipients early during event creation", async () => {
    // Mock the algorithmInstancesService to return specific participants
    jest
      .spyOn(eventsService["algorithmInstancesService"], "getAlgorithmInstance")
      .mockResolvedValue({
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
    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "Test Event";
    const EVENT_NUMBER = 2;
    const authorizationHeader = `Bearer FAKE_TOKEN`;

    const event = await eventsService.createAlgorithmEvent({
      algorithmInstanceId: algorithmInstanceId,
      authorizationHeader,
      createEvent: {
        eventId: ALGORITHM_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP
      }
    });

    expect(event).toBeDefined();
    expect(event.eventId).toBe(ALGORITHM_EVENT_ID);
  });
});
