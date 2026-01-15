import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260107144715 implements MigrationInterface {
    name = 'Postgres20260107144715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "tokenEndpointAuthMethod" character varying NOT NULL DEFAULT 'client_secret_post'`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "jwk" text`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ALTER COLUMN "clientSecret" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" ALTER COLUMN "clientSecret" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "jwk"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "tokenEndpointAuthMethod"`);
    }

}
