import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250303140931 implements MigrationInterface {
    name = 'Postgres20250303140931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "created"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "modified"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "deleted"`);
        await queryRunner.query(`ALTER TABLE "token_dao" DROP COLUMN "created"`);
        await queryRunner.query(`ALTER TABLE "token_dao" DROP COLUMN "modified"`);
        await queryRunner.query(`ALTER TABLE "token_dao" DROP COLUMN "deleted"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "created"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "modified"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "deleted"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "createdDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "modifiedDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "deletedDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "token_dao" ADD "createdDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "token_dao" ADD "modifiedDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "token_dao" ADD "deletedDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "createdDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "modifiedDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "deletedDate" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "deletedDate"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "modifiedDate"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "createdDate"`);
        await queryRunner.query(`ALTER TABLE "token_dao" DROP COLUMN "deletedDate"`);
        await queryRunner.query(`ALTER TABLE "token_dao" DROP COLUMN "modifiedDate"`);
        await queryRunner.query(`ALTER TABLE "token_dao" DROP COLUMN "createdDate"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "deletedDate"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "modifiedDate"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "createdDate"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "deleted" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "modified" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "created" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "token_dao" ADD "deleted" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "token_dao" ADD "modified" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "token_dao" ADD "created" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "deleted" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "modified" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "created" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
