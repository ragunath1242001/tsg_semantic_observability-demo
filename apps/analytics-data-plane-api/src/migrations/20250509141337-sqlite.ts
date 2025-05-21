import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250509141337 implements MigrationInterface {
    name = 'Sqlite20250509141337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('REQUESTED','STARTED','TERMINATED','COMPLETED','SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate" FROM "transfer_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_transfer_dao" RENAME TO "transfer_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME TO "temporary_transfer_dao"`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('dspace:REQUESTED','dspace:STARTED','dspace:TERMINATED','dspace:COMPLETED','dspace:SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar)`);
        await queryRunner.query(`INSERT INTO "transfer_dao"("id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "role", "processId", "remoteParty", "datasetId", "secret", "state", "request", "response", "dataAddress", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_transfer_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_transfer_dao"`);
    }

}
