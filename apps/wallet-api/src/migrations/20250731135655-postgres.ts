import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250731135655 implements MigrationInterface {
    name = 'Postgres20250731135655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issue_configuration" ADD "proofType" character varying NOT NULL DEFAULT 'jwt'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issue_configuration" DROP COLUMN "proofType"`);
    }

}
