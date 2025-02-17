import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250214121345 implements MigrationInterface {
    name = 'Sqlite20250214121345'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "key_dao" ("kid" varchar PRIMARY KEY NOT NULL, "privateKey" text NOT NULL, "publicKey" text NOT NULL, "createdAt" datetime NOT NULL, "expiresAt" datetime NOT NULL, "current" boolean NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "oauth_user" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "token_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "accessTokenExpiresAt" datetime NOT NULL, "refreshToken" varchar, "refreshTokenExpiresAt" datetime, "scope" varchar NOT NULL, "clientId" varchar, "userId" integer, "revoked" boolean NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "token_dao"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
        await queryRunner.query(`DROP TABLE "key_dao"`);
    }

}
