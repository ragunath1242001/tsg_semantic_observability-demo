import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250526130543 implements MigrationInterface {
    name = 'Postgres20250526130543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "analysis_dao" ("id" character varying NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL, "startedAt" TIMESTAMP NOT NULL, "finishedAt" TIMESTAMP, "participantIds" text NOT NULL, "internalEventsId" character varying, CONSTRAINT "PK_e5c32d9536da2b2a04ba9e3b6f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "internal_event_dao" ("id" character varying NOT NULL, "name" character varying NOT NULL, "number" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "data" text, "analysisId" character varying, CONSTRAINT "UQ_36f5151d03af2ea4af70f510ffb" UNIQUE ("number"), CONSTRAINT "PK_d90f3a6f88205a3c61ba3333524" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "algorithm_event_dao" ("id" character varying NOT NULL, "eventId" character varying NOT NULL, "name" character varying NOT NULL, "number" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, "data" bytea, "isOwnEvent" boolean NOT NULL, "transferId" character varying, "createdBy" character varying NOT NULL, "analysisId" character varying, CONSTRAINT "UQ_ef52d34206bc1c0b8476ddc1e6f" UNIQUE ("eventId"), CONSTRAINT "UQ_f1cbd9a6af15460620f1041afe3" UNIQUE ("number"), CONSTRAINT "PK_8d67a8327465839870da9e7df44" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ADD "analysisId" character varying`);
        await queryRunner.query(`ALTER TABLE "analysis_dao" ADD CONSTRAINT "FK_d1b52a2bc23031df5517784f0bf" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" ADD CONSTRAINT "FK_a405d010de4af92b7776deda311" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ADD CONSTRAINT "FK_40bfe0d0c5a055c297344dece5a" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD CONSTRAINT "FK_15afd57802b47854c13da01ecbf" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP CONSTRAINT "FK_15afd57802b47854c13da01ecbf"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" DROP CONSTRAINT "FK_40bfe0d0c5a055c297344dece5a"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" DROP CONSTRAINT "FK_a405d010de4af92b7776deda311"`);
        await queryRunner.query(`ALTER TABLE "analysis_dao" DROP CONSTRAINT "FK_d1b52a2bc23031df5517784f0bf"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" DROP COLUMN "analysisId"`);
        await queryRunner.query(`DROP TABLE "algorithm_event_dao"`);
        await queryRunner.query(`DROP TABLE "internal_event_dao"`);
        await queryRunner.query(`DROP TABLE "analysis_dao"`);
    }

}
