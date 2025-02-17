import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250214121345 implements MigrationInterface {
    name = 'Postgres20250214121345'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "key_dao" ("kid" character varying NOT NULL, "privateKey" text NOT NULL, "publicKey" text NOT NULL, "createdAt" TIMESTAMP NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "current" boolean NOT NULL, CONSTRAINT "PK_16d7771f3e18ae9c9b660d94a73" PRIMARY KEY ("kid"))`);
        await queryRunner.query(`CREATE TABLE "oauth_user" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "email" character varying NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, CONSTRAINT "PK_c1e31b84cedaa9135fd13ca1620" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "secretName" character varying NOT NULL, "clientId" character varying NOT NULL, "clientSecret" character varying NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "redirectUris" text NOT NULL, CONSTRAINT "PK_d6e58a7e0ec3ac17a67ba7f97cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "token_dao" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "accessToken" character varying NOT NULL, "accessTokenExpiresAt" TIMESTAMP NOT NULL, "refreshToken" character varying, "refreshTokenExpiresAt" TIMESTAMP, "scope" character varying NOT NULL, "clientId" character varying, "userId" integer, "revoked" boolean NOT NULL, CONSTRAINT "PK_126e2df3b842e5abafae4166274" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "token_dao"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
        await queryRunner.query(`DROP TABLE "key_dao"`);
    }

}
