import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260105163611 implements MigrationInterface {
    name = 'Postgres20260105163611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" ADD "metadataStatus" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "metadata" ADD "metadataError" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "metadataError"`);
        await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "metadataStatus"`);
    }

}
