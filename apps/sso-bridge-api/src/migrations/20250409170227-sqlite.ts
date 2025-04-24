import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250409170227 implements MigrationInterface {
    name = 'Sqlite20250409170227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_role" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "oauth_user_roles_oauth_role" ("oauthUserId" integer NOT NULL, "oauthRoleId" integer NOT NULL, PRIMARY KEY ("oauthUserId", "oauthRoleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_40441534cbeab8be66d6db15ca" ON "oauth_user_roles_oauth_role" ("oauthUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e2393a3d0615f583e34af0a0ef" ON "oauth_user_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`CREATE TABLE "oauth_client_roles_oauth_role" ("oauthClientId" integer NOT NULL, "oauthRoleId" integer NOT NULL, PRIMARY KEY ("oauthClientId", "oauthRoleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8a1a20e5594d518de7091dda7a" ON "oauth_client_roles_oauth_role" ("oauthClientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_80687e7520f8f3a34461458c21" ON "oauth_client_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "grants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_user"("id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate" FROM "oauth_user"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_user" RENAME TO "oauth_user"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_client"("id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate" FROM "oauth_client"`);
        await queryRunner.query(`DROP TABLE "oauth_client"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_client" RENAME TO "oauth_client"`);
        await queryRunner.query(`DROP INDEX "IDX_40441534cbeab8be66d6db15ca"`);
        await queryRunner.query(`DROP INDEX "IDX_e2393a3d0615f583e34af0a0ef"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_user_roles_oauth_role" ("oauthUserId" integer NOT NULL, "oauthRoleId" integer NOT NULL, CONSTRAINT "FK_40441534cbeab8be66d6db15ca8" FOREIGN KEY ("oauthUserId") REFERENCES "oauth_user" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_e2393a3d0615f583e34af0a0ef2" FOREIGN KEY ("oauthRoleId") REFERENCES "oauth_role" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("oauthUserId", "oauthRoleId"))`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_user_roles_oauth_role"("oauthUserId", "oauthRoleId") SELECT "oauthUserId", "oauthRoleId" FROM "oauth_user_roles_oauth_role"`);
        await queryRunner.query(`DROP TABLE "oauth_user_roles_oauth_role"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_user_roles_oauth_role" RENAME TO "oauth_user_roles_oauth_role"`);
        await queryRunner.query(`CREATE INDEX "IDX_40441534cbeab8be66d6db15ca" ON "oauth_user_roles_oauth_role" ("oauthUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e2393a3d0615f583e34af0a0ef" ON "oauth_user_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`DROP INDEX "IDX_8a1a20e5594d518de7091dda7a"`);
        await queryRunner.query(`DROP INDEX "IDX_80687e7520f8f3a34461458c21"`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_client_roles_oauth_role" ("oauthClientId" integer NOT NULL, "oauthRoleId" integer NOT NULL, CONSTRAINT "FK_8a1a20e5594d518de7091dda7af" FOREIGN KEY ("oauthClientId") REFERENCES "oauth_client" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_80687e7520f8f3a34461458c212" FOREIGN KEY ("oauthRoleId") REFERENCES "oauth_role" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("oauthClientId", "oauthRoleId"))`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_client_roles_oauth_role"("oauthClientId", "oauthRoleId") SELECT "oauthClientId", "oauthRoleId" FROM "oauth_client_roles_oauth_role"`);
        await queryRunner.query(`DROP TABLE "oauth_client_roles_oauth_role"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_client_roles_oauth_role" RENAME TO "oauth_client_roles_oauth_role"`);
        await queryRunner.query(`CREATE INDEX "IDX_8a1a20e5594d518de7091dda7a" ON "oauth_client_roles_oauth_role" ("oauthClientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_80687e7520f8f3a34461458c21" ON "oauth_client_roles_oauth_role" ("oauthRoleId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_80687e7520f8f3a34461458c21"`);
        await queryRunner.query(`DROP INDEX "IDX_8a1a20e5594d518de7091dda7a"`);
        await queryRunner.query(`ALTER TABLE "oauth_client_roles_oauth_role" RENAME TO "temporary_oauth_client_roles_oauth_role"`);
        await queryRunner.query(`CREATE TABLE "oauth_client_roles_oauth_role" ("oauthClientId" integer NOT NULL, "oauthRoleId" integer NOT NULL, PRIMARY KEY ("oauthClientId", "oauthRoleId"))`);
        await queryRunner.query(`INSERT INTO "oauth_client_roles_oauth_role"("oauthClientId", "oauthRoleId") SELECT "oauthClientId", "oauthRoleId" FROM "temporary_oauth_client_roles_oauth_role"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_client_roles_oauth_role"`);
        await queryRunner.query(`CREATE INDEX "IDX_80687e7520f8f3a34461458c21" ON "oauth_client_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a1a20e5594d518de7091dda7a" ON "oauth_client_roles_oauth_role" ("oauthClientId") `);
        await queryRunner.query(`DROP INDEX "IDX_e2393a3d0615f583e34af0a0ef"`);
        await queryRunner.query(`DROP INDEX "IDX_40441534cbeab8be66d6db15ca"`);
        await queryRunner.query(`ALTER TABLE "oauth_user_roles_oauth_role" RENAME TO "temporary_oauth_user_roles_oauth_role"`);
        await queryRunner.query(`CREATE TABLE "oauth_user_roles_oauth_role" ("oauthUserId" integer NOT NULL, "oauthRoleId" integer NOT NULL, PRIMARY KEY ("oauthUserId", "oauthRoleId"))`);
        await queryRunner.query(`INSERT INTO "oauth_user_roles_oauth_role"("oauthUserId", "oauthRoleId") SELECT "oauthUserId", "oauthRoleId" FROM "temporary_oauth_user_roles_oauth_role"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_user_roles_oauth_role"`);
        await queryRunner.query(`CREATE INDEX "IDX_e2393a3d0615f583e34af0a0ef" ON "oauth_user_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40441534cbeab8be66d6db15ca" ON "oauth_user_roles_oauth_role" ("oauthUserId") `);
        await queryRunner.query(`ALTER TABLE "oauth_client" RENAME TO "temporary_oauth_client"`);
        await queryRunner.query(`CREATE TABLE "oauth_client" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "secretName" varchar NOT NULL, "clientId" varchar NOT NULL, "clientSecret" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "redirectUris" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "oauth_client"("id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "secretName", "clientId", "clientSecret", "grants", "name", "description", "redirectUris", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_oauth_client"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_client"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" RENAME TO "temporary_oauth_user"`);
        await queryRunner.query(`CREATE TABLE "oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "roles" text NOT NULL, "grants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "oauth_user"("id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_oauth_user"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_user"`);
        await queryRunner.query(`DROP INDEX "IDX_80687e7520f8f3a34461458c21"`);
        await queryRunner.query(`DROP INDEX "IDX_8a1a20e5594d518de7091dda7a"`);
        await queryRunner.query(`DROP TABLE "oauth_client_roles_oauth_role"`);
        await queryRunner.query(`DROP INDEX "IDX_e2393a3d0615f583e34af0a0ef"`);
        await queryRunner.query(`DROP INDEX "IDX_40441534cbeab8be66d6db15ca"`);
        await queryRunner.query(`DROP TABLE "oauth_user_roles_oauth_role"`);
        await queryRunner.query(`DROP TABLE "oauth_role"`);
    }

}
