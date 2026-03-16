import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260311205313 implements MigrationInterface {
    name = 'Postgres20260311205313'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" ALTER COLUMN "secretName" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" ALTER COLUMN "secretName" SET NOT NULL`);
    }

}
