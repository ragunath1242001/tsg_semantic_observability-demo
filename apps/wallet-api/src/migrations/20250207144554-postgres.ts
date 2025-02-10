import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250207144554 implements MigrationInterface {
    name = 'Postgres20250207144554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential_issuance" ALTER COLUMN "holderId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential_issuance" ALTER COLUMN "holderId" SET NOT NULL`);
    }

}
