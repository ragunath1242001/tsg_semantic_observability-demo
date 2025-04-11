import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250407140431 implements MigrationInterface {
    name = 'Postgres20250407140431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" ADD "originalFileName" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "originalFileName"`);
    }

}
