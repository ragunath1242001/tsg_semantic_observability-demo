import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20251022084215 implements MigrationInterface {
    name = 'Postgres20251022084215'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataplanedetails" DROP COLUMN "managementToken"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataplanedetails" ADD "managementToken" character varying NOT NULL`);
    }

}
