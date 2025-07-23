import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250721153844 implements MigrationInterface {
    name = 'Postgres20250721153844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer_dao" DROP CONSTRAINT "FK_40bfe0d0c5a055c297344dece5a"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" DROP CONSTRAINT "FK_a405d010de4af92b7776deda311"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP CONSTRAINT "FK_15afd57802b47854c13da01ecbf"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME COLUMN "analysisId" TO "algorithmInstanceId"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" RENAME COLUMN "analysisId" TO "algorithmInstanceId"`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" character varying NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" character varying NOT NULL DEFAULT now(), "status" character varying NOT NULL, "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "internalEventsId" character varying, CONSTRAINT "PK_a9ca1f33823d0b823a6b883c49d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP COLUMN "analysisId"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD "recipients" text`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD "algorithmInstanceId" character varying`);
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
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP COLUMN "algorithmInstanceId"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP COLUMN "recipients"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD "analysisId" character varying`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" RENAME COLUMN "algorithmInstanceId" TO "analysisId"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" RENAME COLUMN "algorithmInstanceId" TO "analysisId"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD CONSTRAINT "FK_15afd57802b47854c13da01ecbf" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" ADD CONSTRAINT "FK_a405d010de4af92b7776deda311" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ADD CONSTRAINT "FK_40bfe0d0c5a055c297344dece5a" FOREIGN KEY ("analysisId") REFERENCES "analysis_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
