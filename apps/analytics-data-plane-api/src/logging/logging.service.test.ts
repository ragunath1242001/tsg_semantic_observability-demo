import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoggingConfig } from "../config.js";
import { IngressLogDao, EgressLogDao } from "./logging.dao.js";
import { LoggingService } from "./logging.service.js";
import { PageOptionsDto } from "../utils/pagination.js";
import { plainToInstance } from "class-transformer";
import { LogEntry, LogFilterDto } from "./logging.dto.js";
import { TypeOrmTestHelper, AuthConfig } from "@tsg-dsp/common-api";

describe("Logging Service", () => {
  let loggingService: LoggingService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([IngressLogDao, EgressLogDao]),
        TypeOrmModule.forFeature([IngressLogDao, EgressLogDao])
      ],
      providers: [
        LoggingService,
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: LoggingConfig,
          useValue: { debug: true }
        }
      ]
    }).compile();

    loggingService = moduleRef.get(LoggingService);
  });

  describe("Ingress logging", () => {
    it("Insert ingress logs", async () => {
      const logEntry: LogEntry = {
        date: new Date(),
        remoteParty: "did:web:remoteparty",
        transferId: "385e7b70-1e8d-47c0-8039-80d10ec22f28",
        datasetId: "urn:uuid:86ed7838-4f1c-475f-836e-439b35ee95d5",
        path: "anything",
        method: "GET",
        status: 200,
        debug: {
          request: {
            headers: {
              accept: "application/json, text/plain, */*",
              authorization:
                "Bearer 0401aa089e1cfba27e92a8b0ff61ef005c15ddb02857c7cfc0e731254415f807"
            },
            query: {},
            bodyLength: -1
          },
          response: {
            headers: {
              "access-control-allow-origin": "*",
              date: "Wed, 22 May 2024 21:20:04 GMT",
              "content-type": "application/json",
              "content-length": "1300",
              connection: "keep-alive",
              server: "gunicorn/19.9.0",
              "access-control-allow-credentials": "true"
            }
          }
        }
      };
      const log = await loggingService.insertIngressLog({ ...logEntry });
      expect(log.identifier).toBeDefined();
      const log2 = await loggingService.insertIngressLog({
        ...logEntry,
        remoteParty: "did:web:remoteparty2",
        transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
        datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6"
      });
      expect(log2.identifier).toBeDefined();
      expect(log2.identifier).toBeGreaterThan(log.identifier);
      for (let i = 0; i < 10; i++) {
        await loggingService.insertIngressLog({ ...logEntry });
        await loggingService.insertIngressLog({
          ...logEntry,
          remoteParty: "did:web:remoteparty2",
          transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
          datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6"
        });
      }
    });
    it("Retrieve logs", async () => {
      const page = await loggingService.getIngressLog(
        plainToInstance(PageOptionsDto, {}),
        plainToInstance(LogFilterDto, {})
      );
      expect(page.data).toHaveLength(10);
      expect(page.meta.itemCount).toBe(22);
    });
    it("Retrieve filtered logs", async () => {
      const page = await loggingService.getIngressLog(
        plainToInstance(PageOptionsDto, {}),
        plainToInstance(LogFilterDto, {
          remoteParty: "did:web:remoteparty2",
          transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
          datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6",
          status: "2xx"
        })
      );
      expect(page.data).toHaveLength(10);
      expect(page.meta.itemCount).toBe(11);
      const page2 = await loggingService.getIngressLog(
        plainToInstance(PageOptionsDto, {}),
        plainToInstance(LogFilterDto, {
          remoteParty: "did:web:remoteparty2",
          transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
          datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6",
          status: "200"
        })
      );
      expect(page2.data).toHaveLength(10);
      expect(page2.meta.itemCount).toBe(11);
    });
  });

  describe("Egress logging", () => {
    it("Insert egress logs", async () => {
      const logEntry: LogEntry = {
        date: new Date(),
        remoteParty: "did:web:remoteparty",
        transferId: "385e7b70-1e8d-47c0-8039-80d10ec22f28",
        datasetId: "urn:uuid:86ed7838-4f1c-475f-836e-439b35ee95d5",
        path: "anything",
        method: "GET",
        status: 200,
        debug: {
          request: {
            headers: {
              accept: "application/json, text/plain, */*",
              authorization:
                "Bearer 0401aa089e1cfba27e92a8b0ff61ef005c15ddb02857c7cfc0e731254415f807"
            },
            query: {},
            bodyLength: -1
          },
          response: {
            headers: {
              "access-control-allow-origin": "*",
              date: "Wed, 22 May 2024 21:20:04 GMT",
              "content-type": "application/json",
              "content-length": "1300",
              connection: "keep-alive",
              server: "gunicorn/19.9.0",
              "access-control-allow-credentials": "true"
            }
          }
        }
      };
      const log = await loggingService.insertEgressLog({ ...logEntry });
      expect(log.identifier).toBeDefined();
      const log2 = await loggingService.insertEgressLog({
        ...logEntry,
        remoteParty: "did:web:remoteparty2",
        transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
        datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6"
      });
      expect(log2.identifier).toBeDefined();
      expect(log2.identifier).toBeGreaterThan(log.identifier);
      for (let i = 0; i < 10; i++) {
        await loggingService.insertEgressLog({ ...logEntry });
        await loggingService.insertEgressLog({
          ...logEntry,
          remoteParty: "did:web:remoteparty2",
          transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
          datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6"
        });
      }
    });
    it("Retrieve logs", async () => {
      const page = await loggingService.getEgressLog(
        plainToInstance(PageOptionsDto, {}),
        plainToInstance(LogFilterDto, {})
      );
      expect(page.data).toHaveLength(10);
      expect(page.meta.itemCount).toBe(22);
    });
    it("Retrieve filtered logs", async () => {
      const page = await loggingService.getEgressLog(
        plainToInstance(PageOptionsDto, {}),
        plainToInstance(LogFilterDto, {
          remoteParty: "did:web:remoteparty2",
          transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
          datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6",
          status: "2xx"
        })
      );
      expect(page.data).toHaveLength(10);
      expect(page.meta.itemCount).toBe(11);
      const page2 = await loggingService.getEgressLog(
        plainToInstance(PageOptionsDto, {}),
        plainToInstance(LogFilterDto, {
          remoteParty: "did:web:remoteparty2",
          transferId: "b1434c6a-ae44-4c91-9d0a-b7d7a8117933",
          datasetId: "urn:uuid:c907459f-3572-43fc-8ac4-98fcbd0d3ab6",
          status: "200"
        })
      );
      expect(page2.data).toHaveLength(10);
      expect(page2.meta.itemCount).toBe(11);
    });
  });
});
