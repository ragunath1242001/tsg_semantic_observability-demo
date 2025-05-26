import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";

import { AnalysesService } from "../analyses/analyses.service.js";
import { AnalysisDao } from "../analyses/dao/analysis.dao.js";
import { RootConfig } from "../config.js";
import { DataPlaneStateDao } from "../dataplane/dataplane.dao.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { AlgorithmEventDao } from "./dao/algorithm-event.dao.js";
import { InternalEventDao } from "./dao/internal-event.dao.js";
import { EventsService } from "./events.service.js";

describe("EventsService", () => {
  const TRANSFER_ID = "urn:uuid:16228d2e-5662-4961-bf2c-d929f48a7f3f";
  const REMOTE_PARTY_ID = "did:web:remoteparty1";
  const ALGORITHM_EVENT_ID = "urn:uuid:16a3b006-faa7-41fb-bffd-55d900a1ee0f";
  const JOB_ALGORITHM_EVENT_ID =
    "urn:uuid:94d26207-f86e-47d0-966f-b0869ec29f02";
  const INTERNAL_EVENT_ID = "urn:uuid:875451b2-21f2-42c1-abbe-c30588f64ef8";

  let analysisId: string;
  let eventsAccessToken: string;
  let eventsService: EventsService;
  let analysesService: AnalysesService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AnalysisDao,
          InternalEventDao,
          AlgorithmEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AnalysisDao,
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
            getParticipantId: () => "did:web:localhost"
          }
        },
        EventsService,
        AnalysesService,
        RootConfig
      ]
    }).compile();

    eventsService = moduleRef.get(EventsService);
    analysesService = moduleRef.get(AnalysesService);
  });

  it("should create an analysis", async () => {
    const analysis = await analysesService.create({
      name: "Test Analysis",
      participantIds: [
        "did:web:localhost",
        "did:web:remoteparty1",
        "did:web:remoteparty2"
      ]
    });

    expect(analysis).toBeDefined();
    expect(analysis.id).toBeDefined();
    expect(analysis.name).toBe("Test Analysis");

    analysisId = analysis.id;
  });

  it("should create an internal event", async () => {
    const EVENT_NUMBER = 1;
    const EVENT_TIMESTAMP = new Date().toISOString();
    const event = await eventsService.createInternalEvent({
      analysisId,
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
    eventsAccessToken = await analysesService.createAccessToken(analysisId);
  });

  it("should create a job algorithm event", async () => {
    const JOB_ALGORITHM_EVENT_ID =
      "urn:uuid:94d26207-f86e-47d0-966f-b0869ec29f02";
    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "Test Event";
    const EVENT_NUMBER = 1;
    const authorizationHeader = `Bearer ${eventsAccessToken}`;
    const event = await eventsService.createAlgorithmEvent({
      analysisId,
      authorizationHeader,
      createEvent: {
        eventId: JOB_ALGORITHM_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP,
        isOwnEvent: true
      }
    });

    expect(event.eventId).toBe(JOB_ALGORITHM_EVENT_ID);
  });

  it("should upload event data", async () => {
    const event = await eventsService.uploadAlgorithmEventData({
      analysisId,
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
      analysisId,
      authorizationHeader: `Bearer ${eventsAccessToken}`
    });

    expect(data).toEqual(Buffer.from("Test Event Data"));
  });

  it("should create an algorithm event from another party", async () => {
    const EVENT_TIMESTAMP = new Date().toISOString();
    const EVENT_NAME = "Test Event";
    const EVENT_NUMBER = 2;
    const authorizationHeader = `Bearer FAKE_TOKEN`;

    const event = await eventsService.createAlgorithmEvent({
      analysisId,
      authorizationHeader,
      createEvent: {
        eventId: ALGORITHM_EVENT_ID,
        name: EVENT_NAME,
        number: EVENT_NUMBER,
        timestamp: EVENT_TIMESTAMP,
        isOwnEvent: false
      }
    });

    expect(event).toBeDefined();
    expect(event.eventId).toBe(ALGORITHM_EVENT_ID);
  });
});
