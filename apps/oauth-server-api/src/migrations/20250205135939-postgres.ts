import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250205135939 implements MigrationInterface {
    name = 'Postgres20250205135939'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_user" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, CONSTRAINT "PK_c1e31b84cedaa9135fd13ca1620" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "token_dao" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "accessToken" character varying NOT NULL, "accessTokenExpiresAt" character varying NOT NULL, "refreshToken" character varying NOT NULL, "refreshTokenExpiresAt" character varying NOT NULL, "scope" character varying NOT NULL, "client" character varying, "user" character varying, CONSTRAINT "PK_126e2df3b842e5abafae4166274" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "clientId" character varying NOT NULL, "clientSecret" character varying NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "PK_d6e58a7e0ec3ac17a67ba7f97cd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`DROP TABLE "token_dao"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
    }

}
