import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250523130328 implements MigrationInterface {
    name = 'Postgres20250523130328'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer_detail_dao" DROP COLUMN "process"`);
        await queryRunner.query(`ALTER TABLE "distribution" ADD "AccessServiceId" character varying`);
        await queryRunner.query(`ALTER TABLE "catalog" ADD "participantId" character varying`);
        await queryRunner.query(`ALTER TABLE "distribution" ADD CONSTRAINT "FK_f9e82f5a8f847de7347594104e9" FOREIGN KEY ("AccessServiceId") REFERENCES "dataservice"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "distribution" DROP CONSTRAINT "FK_f9e82f5a8f847de7347594104e9"`);
        await queryRunner.query(`ALTER TABLE "catalog" DROP COLUMN "participantId"`);
        await queryRunner.query(`ALTER TABLE "distribution" DROP COLUMN "AccessServiceId"`);
        await queryRunner.query(`ALTER TABLE "transfer_detail_dao" ADD "process" text NOT NULL`);
    }

}
