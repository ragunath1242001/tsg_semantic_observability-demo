import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260403144648 implements MigrationInterface {
    name = 'Postgres20260403144648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" ADD "orchestrationStatus" character varying`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" ADD "isInitiator" boolean`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" ADD "participantStatuses" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" DROP COLUMN "participantStatuses"`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" DROP COLUMN "isInitiator"`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" DROP COLUMN "orchestrationStatus"`);
    }

}
