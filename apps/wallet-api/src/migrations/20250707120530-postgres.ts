import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250707120530 implements MigrationInterface {
    name = 'Postgres20250707120530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "issue_configuration" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" character varying NOT NULL, "credentialType" character varying NOT NULL, "documentUrl" character varying, "document" text, "schema" text, "name" character varying, "description" character varying, "backgroundColor" character varying, "backgroundImage" character varying, "textColor" character varying, CONSTRAINT "PK_86566941fa1ba49d1533a224572" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP COLUMN "nonce"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD "nonce" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "issue_configuration"`);
    }

}
