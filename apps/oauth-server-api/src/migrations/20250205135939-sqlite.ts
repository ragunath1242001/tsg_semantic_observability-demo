import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250205135939 implements MigrationInterface {
    name = 'Sqlite20250205135939'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_user" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "token_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "accessTokenExpiresAt" varchar NOT NULL, "refreshToken" varchar NOT NULL, "refreshTokenExpiresAt" varchar NOT NULL, "scope" varchar NOT NULL, "client" varchar, "user" varchar)`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`DROP TABLE "token_dao"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
    }

}
