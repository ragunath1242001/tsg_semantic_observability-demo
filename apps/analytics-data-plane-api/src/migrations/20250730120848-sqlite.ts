import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250730120848 implements MigrationInterface {
    name = 'Sqlite20250730120848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "details" text NOT NULL, "dataset" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "originalFileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text)`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "algorithmInstanceId" varchar)`);
        await queryRunner.query(`CREATE TABLE "internal_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" text, "algorithmInstanceId" varchar)`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar)`);
        await queryRunner.query(`CREATE TABLE "algorithm_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "eventId" varchar NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" blob, "isOwnEvent" boolean NOT NULL, "transferIds" text, "createdBy" varchar NOT NULL, "recipients" text, "algorithmInstanceId" varchar, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"))`);
        await queryRunner.query(`CREATE TABLE "temporary_transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "algorithmInstanceId" varchar, CONSTRAINT "FK_2cc4970e567c420b556cb2233e3" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "algorithmInstanceId") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "algorithmInstanceId" FROM "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_transfer_dao" RENAME TO "transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_internal_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" text, "algorithmInstanceId" varchar, CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_internal_event_dao"("id", "name", "number", "timestamp", "data", "algorithmInstanceId") SELECT "id", "name", "number", "timestamp", "data", "algorithmInstanceId" FROM "internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "internal_event_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_internal_event_dao" RENAME TO "internal_event_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar, CONSTRAINT "FK_6fd0401a16eab13575446a07fe7" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId" FROM "algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_algorithm_instance_dao" RENAME TO "algorithm_instance_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_algorithm_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "eventId" varchar NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" blob, "isOwnEvent" boolean NOT NULL, "transferIds" text, "createdBy" varchar NOT NULL, "recipients" text, "algorithmInstanceId" varchar, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"), CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_algorithm_event_dao"("id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferIds", "createdBy", "recipients", "algorithmInstanceId") SELECT "id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferIds", "createdBy", "recipients", "algorithmInstanceId" FROM "algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_event_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_algorithm_event_dao" RENAME TO "algorithm_event_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" RENAME TO "temporary_algorithm_event_dao"`);
        await queryRunner.query(`CREATE TABLE "algorithm_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "eventId" varchar NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" blob, "isOwnEvent" boolean NOT NULL, "transferIds" text, "createdBy" varchar NOT NULL, "recipients" text, "algorithmInstanceId" varchar, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"))`);
        await queryRunner.query(`INSERT INTO "algorithm_event_dao"("id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferIds", "createdBy", "recipients", "algorithmInstanceId") SELECT "id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferIds", "createdBy", "recipients", "algorithmInstanceId" FROM "temporary_algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_algorithm_event_dao"`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" RENAME TO "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar)`);
        await queryRunner.query(`INSERT INTO "algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId" FROM "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" RENAME TO "temporary_internal_event_dao"`);
        await queryRunner.query(`CREATE TABLE "internal_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" text, "algorithmInstanceId" varchar)`);
        await queryRunner.query(`INSERT INTO "internal_event_dao"("id", "name", "number", "timestamp", "data", "algorithmInstanceId") SELECT "id", "name", "number", "timestamp", "data", "algorithmInstanceId" FROM "temporary_internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_internal_event_dao"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME TO "temporary_transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "algorithmInstanceId" varchar)`);
        await queryRunner.query(`INSERT INTO "transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "algorithmInstanceId") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "algorithmInstanceId" FROM "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "metadata"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
    }

}
