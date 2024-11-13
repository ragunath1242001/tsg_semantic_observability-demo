import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20241112151859 implements MigrationInterface {
    name = 'Postgres20241112151859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" character varying NOT NULL, "details" text NOT NULL, "dataset" text NOT NULL, CONSTRAINT "PK_08b95c167b2cd0e9ac9fa0574c6" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_dao_state_enum" AS ENUM('dspace:REQUESTED', 'dspace:STARTED', 'dspace:TERMINATED', 'dspace:COMPLETED', 'dspace:SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" character varying NOT NULL, "role" character varying NOT NULL, "processId" character varying NOT NULL, "remoteParty" character varying NOT NULL, "datasetId" character varying NOT NULL, "secret" character varying, "state" "public"."transfer_dao_state_enum" NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" character varying NOT NULL DEFAULT now(), "modifiedDate" character varying NOT NULL DEFAULT now(), "deletedDate" character varying, CONSTRAINT "PK_8fb73ac018573cd908c3f0d63c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ingress_log_dao" ("identifier" SERIAL NOT NULL, "date" character varying NOT NULL DEFAULT now(), "remoteParty" character varying(100) NOT NULL, "transferId" character varying(100) NOT NULL, "datasetId" character varying(100) NOT NULL, "path" character varying(100) NOT NULL, "method" character varying(10) NOT NULL, "status" smallint NOT NULL, "debug" text, CONSTRAINT "PK_2e9009b70b3a5b7e3cb7f0c8ec1" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`CREATE TABLE "egress_log_dao" ("identifier" SERIAL NOT NULL, "date" character varying NOT NULL DEFAULT now(), "remoteParty" character varying(100) NOT NULL, "transferId" character varying(100) NOT NULL, "datasetId" character varying(100) NOT NULL, "path" character varying(100) NOT NULL, "method" character varying(10) NOT NULL, "status" smallint NOT NULL, "debug" text, CONSTRAINT "PK_3e872213c2d3e3efcf4920f968a" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`CREATE TABLE "metadata" ("identifier" character varying NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" character varying NOT NULL, "presentInLastCheck" boolean NOT NULL, CONSTRAINT "PK_8a70e29b7266f31e0ec3a8ec8a5" PRIMARY KEY ("identifier"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "metadata"`);
        await queryRunner.query(`DROP TABLE "egress_log_dao"`);
        await queryRunner.query(`DROP TABLE "ingress_log_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_dao_state_enum"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
    }

}
