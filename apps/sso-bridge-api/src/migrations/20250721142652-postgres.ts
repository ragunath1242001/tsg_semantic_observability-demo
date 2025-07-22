import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250721142652 implements MigrationInterface {
    name = 'Postgres20250721142652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_role" ADD "isAdminRole" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_role" DROP COLUMN "isAdminRole"`);
    }

}
