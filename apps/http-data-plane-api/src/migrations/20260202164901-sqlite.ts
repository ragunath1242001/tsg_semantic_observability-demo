import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260202164901 implements MigrationInterface {
    name = 'Sqlite20260202164901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_data_plane_state_dao" ("id" varchar NOT NULL, "details" text NOT NULL, "_id" integer PRIMARY KEY NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_data_plane_state_dao"("id", "details", "_id") SELECT "identifier", "details", "_id" FROM "data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_data_plane_state_dao" RENAME TO "data_plane_state_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_ingress_log_dao" ("date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`INSERT INTO "temporary_ingress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "ingress_log_dao"`);
        await queryRunner.query(`DROP TABLE "ingress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_ingress_log_dao" RENAME TO "ingress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_egress_log_dao" ("date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`INSERT INTO "temporary_egress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "egress_log_dao"`);
        await queryRunner.query(`DROP TABLE "egress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_egress_log_dao" RENAME TO "egress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_http_dataset_config_dao" ("datasetConfig" text)`);
        await queryRunner.query(`INSERT INTO "temporary_http_dataset_config_dao"("datasetConfig") SELECT "datasetConfig" FROM "http_dataset_config_dao"`);
        await queryRunner.query(`DROP TABLE "http_dataset_config_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_http_dataset_config_dao" RENAME TO "http_dataset_config_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_versioned_dataset_dao" ("dataset" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_versioned_dataset_dao"("dataset") SELECT "dataset" FROM "versioned_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "versioned_dataset_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_versioned_dataset_dao" RENAME TO "versioned_dataset_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate" FROM "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_transfer_dao" RENAME TO "transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_ingress_log_dao" ("date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_ingress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "ingress_log_dao"`);
        await queryRunner.query(`DROP TABLE "ingress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_ingress_log_dao" RENAME TO "ingress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_egress_log_dao" ("date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_egress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "egress_log_dao"`);
        await queryRunner.query(`DROP TABLE "egress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_egress_log_dao" RENAME TO "egress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_http_dataset_config_dao" ("datasetConfig" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_http_dataset_config_dao"("datasetConfig") SELECT "datasetConfig" FROM "http_dataset_config_dao"`);
        await queryRunner.query(`DROP TABLE "http_dataset_config_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_http_dataset_config_dao" RENAME TO "http_dataset_config_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_versioned_dataset_dao" ("dataset" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_versioned_dataset_dao"("dataset") SELECT "dataset" FROM "versioned_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "versioned_dataset_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_versioned_dataset_dao" RENAME TO "versioned_dataset_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_dataset_item_dao" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "version" varchar NOT NULL, "backendUrl" varchar NOT NULL, "authorization" varchar, "mediaType" varchar, "schemaRef" varchar, "openApiSpecRef" varchar, "policy" text, "dataset" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_dataset_item_dao"("id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset") SELECT "id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset" FROM "dataset_item_dao"`);
        await queryRunner.query(`DROP TABLE "dataset_item_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_dataset_item_dao" RENAME TO "dataset_item_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId" FROM "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_transfer_dao" RENAME TO "transfer_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME TO "temporary_transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId" FROM "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "dataset_item_dao" RENAME TO "temporary_dataset_item_dao"`);
        await queryRunner.query(`CREATE TABLE "dataset_item_dao" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "version" varchar NOT NULL, "backendUrl" varchar NOT NULL, "authorization" varchar, "mediaType" varchar, "schemaRef" varchar, "openApiSpecRef" varchar, "policy" text, "dataset" text)`);
        await queryRunner.query(`INSERT INTO "dataset_item_dao"("id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset") SELECT "id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset" FROM "temporary_dataset_item_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_dataset_item_dao"`);
        await queryRunner.query(`ALTER TABLE "versioned_dataset_dao" RENAME TO "temporary_versioned_dataset_dao"`);
        await queryRunner.query(`CREATE TABLE "versioned_dataset_dao" ("dataset" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "versioned_dataset_dao"("dataset") SELECT "dataset" FROM "temporary_versioned_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_versioned_dataset_dao"`);
        await queryRunner.query(`ALTER TABLE "http_dataset_config_dao" RENAME TO "temporary_http_dataset_config_dao"`);
        await queryRunner.query(`CREATE TABLE "http_dataset_config_dao" ("datasetConfig" text)`);
        await queryRunner.query(`INSERT INTO "http_dataset_config_dao"("datasetConfig") SELECT "datasetConfig" FROM "temporary_http_dataset_config_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_http_dataset_config_dao"`);
        await queryRunner.query(`ALTER TABLE "egress_log_dao" RENAME TO "temporary_egress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "egress_log_dao" ("date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`INSERT INTO "egress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "temporary_egress_log_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_egress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "ingress_log_dao" RENAME TO "temporary_ingress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "ingress_log_dao" ("date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`INSERT INTO "ingress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "temporary_ingress_log_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_ingress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME TO "temporary_transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar)`);
        await queryRunner.query(`INSERT INTO "transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "versioned_dataset_dao" RENAME TO "temporary_versioned_dataset_dao"`);
        await queryRunner.query(`CREATE TABLE "versioned_dataset_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "dataset" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "versioned_dataset_dao"("dataset") SELECT "dataset" FROM "temporary_versioned_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_versioned_dataset_dao"`);
        await queryRunner.query(`ALTER TABLE "http_dataset_config_dao" RENAME TO "temporary_http_dataset_config_dao"`);
        await queryRunner.query(`CREATE TABLE "http_dataset_config_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "datasetConfig" text)`);
        await queryRunner.query(`INSERT INTO "http_dataset_config_dao"("datasetConfig") SELECT "datasetConfig" FROM "temporary_http_dataset_config_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_http_dataset_config_dao"`);
        await queryRunner.query(`ALTER TABLE "egress_log_dao" RENAME TO "temporary_egress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "egress_log_dao" ("identifier" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`INSERT INTO "egress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "temporary_egress_log_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_egress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "ingress_log_dao" RENAME TO "temporary_ingress_log_dao"`);
        await queryRunner.query(`CREATE TABLE "ingress_log_dao" ("identifier" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`INSERT INTO "ingress_log_dao"("date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug") SELECT "date", "remoteParty", "transferId", "datasetId", "path", "method", "status", "debug" FROM "temporary_ingress_log_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_ingress_log_dao"`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" RENAME TO "temporary_data_plane_state_dao"`);
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" varchar NOT NULL, "details" text NOT NULL, "_id" integer PRIMARY KEY NOT NULL)`);
        await queryRunner.query(`INSERT INTO "data_plane_state_dao"("identifier", "details", "_id") SELECT "id", "details", "_id" FROM "temporary_data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_data_plane_state_dao"`);
    }

}
