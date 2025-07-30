import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250730120853 implements MigrationInterface {
    name = 'Postgres20250730120853'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" character varying NOT NULL, "details" text NOT NULL, "dataset" text NOT NULL, CONSTRAINT "PK_08b95c167b2cd0e9ac9fa0574c6" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`CREATE TABLE "metadata" ("identifier" character varying NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" character varying NOT NULL, "originalFileName" character varying NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text, CONSTRAINT "PK_8a70e29b7266f31e0ec3a8ec8a5" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_dao_state_enum" AS ENUM('REQUESTED', 'STARTED', 'TERMINATED', 'COMPLETED', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "transfer_dao" ("id" character varying NOT NULL, "role" character varying NOT NULL, "processId" character varying NOT NULL, "remoteParty" character varying NOT NULL, "datasetId" character varying NOT NULL, "secret" character varying, "state" "public"."transfer_dao_state_enum" NOT NULL, "request" text NOT NULL, "response" text NOT NULL, "dataAddress" text, "createdDate" character varying NOT NULL DEFAULT now(), "modifiedDate" character varying NOT NULL DEFAULT now(), "deletedDate" character varying, "algorithmInstanceId" character varying, CONSTRAINT "PK_8fb73ac018573cd908c3f0d63c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "internal_event_dao" ("id" character varying NOT NULL, "name" character varying NOT NULL, "number" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "data" text, "algorithmInstanceId" character varying, CONSTRAINT "PK_d90f3a6f88205a3c61ba3333524" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" character varying NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" character varying NOT NULL DEFAULT now(), "status" character varying NOT NULL, "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "internalEventsId" character varying, CONSTRAINT "PK_a9ca1f33823d0b823a6b883c49d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "algorithm_event_dao" ("id" character varying NOT NULL, "eventId" character varying NOT NULL, "name" character varying NOT NULL, "number" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "data" bytea, "isOwnEvent" boolean NOT NULL, "transferIds" text, "createdBy" character varying NOT NULL, "recipients" text, "algorithmInstanceId" character varying, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"), CONSTRAINT "PK_8d67a8327465839870da9e7df44" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ADD CONSTRAINT "FK_2cc4970e567c420b556cb2233e3" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" ADD CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" ADD CONSTRAINT "FK_6fd0401a16eab13575446a07fe7" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58"`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" DROP CONSTRAINT "FK_6fd0401a16eab13575446a07fe7"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" DROP CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" DROP CONSTRAINT "FK_2cc4970e567c420b556cb2233e3"`);
        await queryRunner.query(`DROP TABLE "algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "transfer_dao"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_dao_state_enum"`);
        await queryRunner.query(`DROP TABLE "metadata"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
    }

}
