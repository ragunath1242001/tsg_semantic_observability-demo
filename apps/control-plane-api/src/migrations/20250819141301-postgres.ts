import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250819141301 implements MigrationInterface {
    name = 'Postgres20250819141301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataplanedetails" ADD "title" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataplanedetails" DROP COLUMN "title"`);
    }

}
