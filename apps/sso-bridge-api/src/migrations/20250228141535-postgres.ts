import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250228141535 implements MigrationInterface {
    name = 'Postgres20250228141535'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "identifier" character varying NOT NULL, "presentationDefinition" text NOT NULL, "nonce" character varying NOT NULL, CONSTRAINT "PK_99fc14b0dcc6dd517cb33446f60" PRIMARY KEY ("identifier"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
    }

}
