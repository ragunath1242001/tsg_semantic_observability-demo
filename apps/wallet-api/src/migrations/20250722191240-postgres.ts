import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250722191240 implements MigrationInterface {
    name = 'Postgres20250722191240'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credentials" ADD "proof" text`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "jwt" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "jwt"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "proof"`);
    }

}
