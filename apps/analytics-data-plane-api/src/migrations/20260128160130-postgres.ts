import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260128160130 implements MigrationInterface {
    name = 'Postgres20260128160130'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" ADD "inlineCsvw" boolean`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "inlineCsvw"`);
    }

}
