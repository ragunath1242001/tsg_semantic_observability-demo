import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250303140931 implements MigrationInterface {
    name = 'Sqlite20250303140931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_user"("id", "username", "password", "email", "roles", "grants") SELECT "id", "username", "password", "email", "roles", "grants" FROM "oauth_user"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_user" RENAME TO "oauth_user"`);
        await queryRunner.query(`CREATE TABLE "temporary_token_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "accessTokenExpiresAt" datetime NOT NULL, "refreshToken" varchar, "refreshTokenExpiresAt" datetime, "scope" varchar NOT NULL, "clientId" varchar, "userId" integer, "revoked" boolean NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_token_dao"("id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked") SELECT "id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked" FROM "token_dao"`);
        await queryRunner.query(`DROP TABLE "token_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_token_dao" RENAME TO "token_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_client"("id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris") SELECT "id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris" FROM "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_client" RENAME TO "oauth_client"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_user"("id", "username", "password", "email", "roles", "grants") SELECT "id", "username", "password", "email", "roles", "grants" FROM "oauth_user"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_user" RENAME TO "oauth_user"`);
        await queryRunner.query(`CREATE TABLE "temporary_token_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "accessTokenExpiresAt" datetime NOT NULL, "refreshToken" varchar, "refreshTokenExpiresAt" datetime, "scope" varchar NOT NULL, "clientId" varchar, "userId" integer, "revoked" boolean NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_token_dao"("id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked") SELECT "id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked" FROM "token_dao"`);
        await queryRunner.query(`DROP TABLE "token_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_token_dao" RENAME TO "token_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_client"("id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris") SELECT "id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris" FROM "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_client" RENAME TO "oauth_client"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" RENAME TO "temporary_oauth_client"`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "oauth_client"("id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris") SELECT "id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris" FROM "temporary_oauth_client"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_client"`);
        await queryRunner.query(`ALTER TABLE "token_dao" RENAME TO "temporary_token_dao"`);
        await queryRunner.query(`CREATE TABLE "token_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "accessTokenExpiresAt" datetime NOT NULL, "refreshToken" varchar, "refreshTokenExpiresAt" datetime, "scope" varchar NOT NULL, "clientId" varchar, "userId" integer, "revoked" boolean NOT NULL)`);
        await queryRunner.query(`INSERT INTO "token_dao"("id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked") SELECT "id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked" FROM "temporary_token_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_token_dao"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" RENAME TO "temporary_oauth_user"`);
        await queryRunner.query(`CREATE TABLE "oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "oauth_user"("id", "username", "password", "email", "roles", "grants") SELECT "id", "username", "password", "email", "roles", "grants" FROM "temporary_oauth_user"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_user"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" RENAME TO "temporary_oauth_client"`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "oauth_client"("id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris") SELECT "id", "secretName", "clientId", "clientSecret", "roles", "grants", "name", "description", "redirectUris" FROM "temporary_oauth_client"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_client"`);
        await queryRunner.query(`ALTER TABLE "token_dao" RENAME TO "temporary_token_dao"`);
        await queryRunner.query(`CREATE TABLE "token_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "accessTokenExpiresAt" datetime NOT NULL, "refreshToken" varchar, "refreshTokenExpiresAt" datetime, "scope" varchar NOT NULL, "clientId" varchar, "userId" integer, "revoked" boolean NOT NULL)`);
        await queryRunner.query(`INSERT INTO "token_dao"("id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked") SELECT "id", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "scope", "clientId", "userId", "revoked" FROM "temporary_token_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_token_dao"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" RENAME TO "temporary_oauth_user"`);
        await queryRunner.query(`CREATE TABLE "oauth_user" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "oauth_user"("id", "username", "password", "email", "roles", "grants") SELECT "id", "username", "password", "email", "roles", "grants" FROM "temporary_oauth_user"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_user"`);
    }

}
