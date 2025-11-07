import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20251022084215 implements MigrationInterface {
    name = 'Sqlite20251022084215'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_dataplanedetails" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "identifier" varchar PRIMARY KEY NOT NULL, "created" varchar, "modified" varchar, "health" varchar CHECK( "health" IN ('0','1','2','3','4') ) NOT NULL, "missedHealthChecks" integer NOT NULL, "etag" varchar, "dataplaneType" varchar NOT NULL, "endpointPrefix" varchar NOT NULL, "callbackAddress" varchar NOT NULL, "managementAddress" varchar NOT NULL, "catalogSynchronization" varchar NOT NULL, "role" varchar NOT NULL, "title" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_dataplanedetails"("createdDate", "modifiedDate", "deletedDate", "identifier", "created", "modified", "health", "missedHealthChecks", "etag", "dataplaneType", "endpointPrefix", "callbackAddress", "managementAddress", "catalogSynchronization", "role", "title") SELECT "createdDate", "modifiedDate", "deletedDate", "identifier", "created", "modified", "health", "missedHealthChecks", "etag", "dataplaneType", "endpointPrefix", "callbackAddress", "managementAddress", "catalogSynchronization", "role", "title" FROM "dataplanedetails"`);
        await queryRunner.query(`DROP TABLE "dataplanedetails"`);
        await queryRunner.query(`ALTER TABLE "temporary_dataplanedetails" RENAME TO "dataplanedetails"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataplanedetails" RENAME TO "temporary_dataplanedetails"`);
        await queryRunner.query(`CREATE TABLE "dataplanedetails" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "identifier" varchar PRIMARY KEY NOT NULL, "created" varchar, "modified" varchar, "health" varchar CHECK( "health" IN ('0','1','2','3','4') ) NOT NULL, "missedHealthChecks" integer NOT NULL, "etag" varchar, "dataplaneType" varchar NOT NULL, "endpointPrefix" varchar NOT NULL, "callbackAddress" varchar NOT NULL, "managementAddress" varchar NOT NULL, "managementToken" varchar NOT NULL, "catalogSynchronization" varchar NOT NULL, "role" varchar NOT NULL, "title" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "dataplanedetails"("createdDate", "modifiedDate", "deletedDate", "identifier", "created", "modified", "health", "missedHealthChecks", "etag", "dataplaneType", "endpointPrefix", "callbackAddress", "managementAddress", "catalogSynchronization", "role", "title") SELECT "createdDate", "modifiedDate", "deletedDate", "identifier", "created", "modified", "health", "missedHealthChecks", "etag", "dataplaneType", "endpointPrefix", "callbackAddress", "managementAddress", "catalogSynchronization", "role", "title" FROM "temporary_dataplanedetails"`);
        await queryRunner.query(`DROP TABLE "temporary_dataplanedetails"`);
    }

}
