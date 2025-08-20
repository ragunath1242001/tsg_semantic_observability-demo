import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250818142125 implements MigrationInterface {
    name = 'Postgres20250818142125'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" ADD "mediaType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "metadata" ADD "datasetId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "datasetId"`);
        await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "mediaType"`);
    }

}
