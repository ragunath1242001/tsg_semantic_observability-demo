import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20251210110404 implements MigrationInterface {
    name = 'Postgres20251210110404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" ADD "projectAgreementId" integer`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" ADD CONSTRAINT "FK_e16dc2433aa04af491c0def4571" FOREIGN KEY ("projectAgreementId") REFERENCES "project_agreement_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" DROP CONSTRAINT "FK_e16dc2433aa04af491c0def4571"`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" DROP COLUMN "projectAgreementId"`);
    }

}
