import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250313110856 implements MigrationInterface {
    name = 'Postgres20250313110856'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD "remoteId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP COLUMN "remoteId"`);
    }

}
