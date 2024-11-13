import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20241112151859 implements MigrationInterface {
    name = 'Sqlite20241112151859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "processId" varchar NOT NULL, "remoteParty" varchar NOT NULL, "datasetId" varchar NOT NULL, "secret" varchar, "state" varchar CHECK( "state" IN ('dspace:REQUESTED','dspace:STARTED','dspace:TERMINATED','dspace:COMPLETED','dspace:SUSPENDED') ) NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "modifiedDate" varchar NOT NULL DEFAULT (datetime('now')), "deletedDate" varchar)`);
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "managementToken" varchar NOT NULL, "details" text NOT NULL, "datasetConfig" text, "dataset" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "ingress_log_dao" ("identifier" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
        await queryRunner.query(`CREATE TABLE "egress_log_dao" ("identifier" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" varchar NOT NULL DEFAULT (datetime('now')), "remoteParty" varchar(100) NOT NULL, "transferId" varchar(100) NOT NULL, "datasetId" varchar(100) NOT NULL, "path" varchar(100) NOT NULL, "method" varchar(10) NOT NULL, "status" smallint NOT NULL, "debug" text)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "egress_log_dao"`);
        await queryRunner.query(`DROP TABLE "ingress_log_dao"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
    }

}
