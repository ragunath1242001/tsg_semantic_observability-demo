import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260331115424 implements MigrationInterface {
    name = 'Postgres20260331115424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataset_item_dao" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "dataset_item_dao" ADD "extraProps" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataset_item_dao" DROP COLUMN "extraProps"`);
        await queryRunner.query(`ALTER TABLE "dataset_item_dao" DROP COLUMN "description"`);
    }

}
