import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260107144715 implements MigrationInterface {
    name = 'Sqlite20260107144715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "tokenEndpointAuthMethod" varchar NOT NULL DEFAULT ('client_secret_post'), "jwk" text)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_client"("id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate" FROM "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_client" RENAME TO "oauth_client"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "tokenEndpointAuthMethod" varchar NOT NULL DEFAULT ('client_secret_post'), "jwk" text)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_client"("id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate", "tokenEndpointAuthMethod", "jwk") SELECT "id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate", "tokenEndpointAuthMethod", "jwk" FROM "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_client" RENAME TO "oauth_client"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client" RENAME TO "temporary_oauth_client"`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "tokenEndpointAuthMethod" varchar NOT NULL DEFAULT ('client_secret_post'), "jwk" text)`);
        await queryRunner.query(`INSERT INTO "oauth_client"("id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate", "tokenEndpointAuthMethod", "jwk") SELECT "id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate", "tokenEndpointAuthMethod", "jwk" FROM "temporary_oauth_client"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_client"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" RENAME TO "temporary_oauth_client"`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "oauth_client"("id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_oauth_client"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_client"`);
    }

}
