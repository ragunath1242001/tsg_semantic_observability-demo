import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250526130538 implements MigrationInterface {
    name = 'Sqlite20250526130538'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "analysis_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "status" varchar NOT NULL, "startedAt" datetime NOT NULL, "finishedAt" datetime, "participantIds" text NOT NULL, "internalEventsId" varchar)`);
        await queryRunner.query(`CREATE TABLE "internal_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" text, "analysisId" varchar, CONSTRAINT "UQ_36f5151d03af2ea4af70f510ffb" UNIQUE ("number"))`);
        await queryRunner.query(`CREATE TABLE "algorithm_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "eventId" varchar NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" blob, "isOwnEvent" boolean NOT NULL, "transferId" varchar, "createdBy" varchar NOT NULL, "analysisId" varchar, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"), CONSTRAINT "UQ_f1cbd9a6af15460620f1041afe3" UNIQUE ("number"))`);
        await queryRunner.query(`CREATE TABLE "temporary_transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "analysisId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate" FROM "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_transfer_dao" RENAME TO "transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_analysis_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "status" varchar NOT NULL, "startedAt" datetime NOT NULL, "finishedAt" datetime, "participantIds" text NOT NULL, "internalEventsId" varchar, CONSTRAINT "FK_d1b52a2bc23031df5517784f0bf" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_analysis_dao"("id", "name", "status", "startedAt", "finishedAt", "participantIds", "internalEventsId") SELECT "id", "name", "status", "startedAt", "finishedAt", "participantIds", "internalEventsId" FROM "analysis_dao"`);
        await queryRunner.query(`DROP TABLE "analysis_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_analysis_dao" RENAME TO "analysis_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_internal_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" text, "analysisId" varchar, CONSTRAINT "UQ_36f5151d03af2ea4af70f510ffb" UNIQUE ("number"), CONSTRAINT "FK_a405d010de4af92b7776deda311" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_internal_event_dao"("id", "name", "number", "timestamp", "data", "analysisId") SELECT "id", "name", "number", "timestamp", "data", "analysisId" FROM "internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "internal_event_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_internal_event_dao" RENAME TO "internal_event_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "analysisId" varchar, CONSTRAINT "FK_40bfe0d0c5a055c297344dece5a" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "analysisId") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "analysisId" FROM "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_transfer_dao" RENAME TO "transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_algorithm_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "eventId" varchar NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" blob, "isOwnEvent" boolean NOT NULL, "transferId" varchar, "createdBy" varchar NOT NULL, "analysisId" varchar, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"), CONSTRAINT "UQ_f1cbd9a6af15460620f1041afe3" UNIQUE ("number"), CONSTRAINT "FK_15afd57802b47854c13da01ecbf" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_algorithm_event_dao"("id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferId", "createdBy", "analysisId") SELECT "id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferId", "createdBy", "analysisId" FROM "algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_event_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_algorithm_event_dao" RENAME TO "algorithm_event_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" RENAME TO "temporary_algorithm_event_dao"`);
        await queryRunner.query(`CREATE TABLE "algorithm_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "eventId" varchar NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" blob, "isOwnEvent" boolean NOT NULL, "transferId" varchar, "createdBy" varchar NOT NULL, "analysisId" varchar, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"), CONSTRAINT "UQ_f1cbd9a6af15460620f1041afe3" UNIQUE ("number"))`);
        await queryRunner.query(`INSERT INTO "algorithm_event_dao"("id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferId", "createdBy", "analysisId") SELECT "id", "eventId", "name", "number", "timestamp", "data", "isOwnEvent", "transferId", "createdBy", "analysisId" FROM "temporary_algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_algorithm_event_dao"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME TO "temporary_transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "analysisId" varchar)`);
        await queryRunner.query(`INSERT INTO "transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "analysisId") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "analysisId" FROM "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" RENAME TO "temporary_internal_event_dao"`);
        await queryRunner.query(`CREATE TABLE "internal_event_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "number" integer NOT NULL, "timestamp" datetime NOT NULL, "data" text, "analysisId" varchar, CONSTRAINT "UQ_36f5151d03af2ea4af70f510ffb" UNIQUE ("number"))`);
        await queryRunner.query(`INSERT INTO "internal_event_dao"("id", "name", "number", "timestamp", "data", "analysisId") SELECT "id", "name", "number", "timestamp", "data", "analysisId" FROM "temporary_internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_internal_event_dao"`);
        await queryRunner.query(`ALTER TABLE "analysis_dao" RENAME TO "temporary_analysis_dao"`);
        await queryRunner.query(`CREATE TABLE "analysis_dao" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "status" varchar NOT NULL, "startedAt" datetime NOT NULL, "finishedAt" datetime, "participantIds" text NOT NULL, "internalEventsId" varchar)`);
        await queryRunner.query(`INSERT INTO "analysis_dao"("id", "name", "status", "startedAt", "finishedAt", "participantIds", "internalEventsId") SELECT "id", "name", "status", "startedAt", "finishedAt", "participantIds", "internalEventsId" FROM "temporary_analysis_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_analysis_dao"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME TO "temporary_transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar)`);
        await queryRunner.query(`INSERT INTO "transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "analysis_dao"`);
    }

}
