import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260113132643 implements MigrationInterface {
    name = 'Sqlite20260113132643'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "web_authn_credential" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "credentialId" varchar NOT NULL, "publicKey" varchar NOT NULL, "counter" integer NOT NULL DEFAULT (0), "deviceName" varchar, "transports" varchar, "lastUsed" datetime NOT NULL, CONSTRAINT "UQ_b0d9884eca4df9e50b3d7bad189" UNIQUE ("credentialId"))`);
        await queryRunner.query(`CREATE TABLE "totp_credential" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "secret" varchar NOT NULL, "deviceName" varchar, "isVerified" boolean NOT NULL DEFAULT (0), "lastUsed" datetime)`);
        await queryRunner.query(`CREATE TABLE "recovery_code" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "codeHash" varchar NOT NULL, "used" boolean NOT NULL DEFAULT (0), "usedAt" datetime)`);
        await queryRunner.query(`CREATE TABLE "temporary_oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "grants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "require2FA" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_user"("id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate" FROM "oauth_user"`);
        await queryRunner.query(`DROP TABLE "oauth_user"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_user" RENAME TO "oauth_user"`);
        await queryRunner.query(`CREATE TABLE "temporary_web_authn_credential" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "credentialId" varchar NOT NULL, "publicKey" varchar NOT NULL, "counter" integer NOT NULL DEFAULT (0), "deviceName" varchar, "transports" varchar, "lastUsed" datetime NOT NULL, CONSTRAINT "UQ_b0d9884eca4df9e50b3d7bad189" UNIQUE ("credentialId"), CONSTRAINT "FK_609fa7bda999525a4fa55cd9354" FOREIGN KEY ("userId") REFERENCES "oauth_user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_web_authn_credential"("createdDate", "modifiedDate", "deletedDate", "id", "userId", "credentialId", "publicKey", "counter", "deviceName", "transports", "lastUsed") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "userId", "credentialId", "publicKey", "counter", "deviceName", "transports", "lastUsed" FROM "web_authn_credential"`);
        await queryRunner.query(`DROP TABLE "web_authn_credential"`);
        await queryRunner.query(`ALTER TABLE "temporary_web_authn_credential" RENAME TO "web_authn_credential"`);
        await queryRunner.query(`CREATE TABLE "temporary_totp_credential" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "secret" varchar NOT NULL, "deviceName" varchar, "isVerified" boolean NOT NULL DEFAULT (0), "lastUsed" datetime, CONSTRAINT "FK_9180faedc035e0ba4514062a302" FOREIGN KEY ("userId") REFERENCES "oauth_user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_totp_credential"("createdDate", "modifiedDate", "deletedDate", "id", "userId", "secret", "deviceName", "isVerified", "lastUsed") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "userId", "secret", "deviceName", "isVerified", "lastUsed" FROM "totp_credential"`);
        await queryRunner.query(`DROP TABLE "totp_credential"`);
        await queryRunner.query(`ALTER TABLE "temporary_totp_credential" RENAME TO "totp_credential"`);
        await queryRunner.query(`CREATE TABLE "temporary_recovery_code" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "codeHash" varchar NOT NULL, "used" boolean NOT NULL DEFAULT (0), "usedAt" datetime, CONSTRAINT "FK_0e10289994b9a90be4cde06e15c" FOREIGN KEY ("userId") REFERENCES "oauth_user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_recovery_code"("createdDate", "modifiedDate", "deletedDate", "id", "userId", "codeHash", "used", "usedAt") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "userId", "codeHash", "used", "usedAt" FROM "recovery_code"`);
        await queryRunner.query(`DROP TABLE "recovery_code"`);
        await queryRunner.query(`ALTER TABLE "temporary_recovery_code" RENAME TO "recovery_code"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recovery_code" RENAME TO "temporary_recovery_code"`);
        await queryRunner.query(`CREATE TABLE "recovery_code" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "codeHash" varchar NOT NULL, "used" boolean NOT NULL DEFAULT (0), "usedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "recovery_code"("createdDate", "modifiedDate", "deletedDate", "id", "userId", "codeHash", "used", "usedAt") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "userId", "codeHash", "used", "usedAt" FROM "temporary_recovery_code"`);
        await queryRunner.query(`DROP TABLE "temporary_recovery_code"`);
        await queryRunner.query(`ALTER TABLE "totp_credential" RENAME TO "temporary_totp_credential"`);
        await queryRunner.query(`CREATE TABLE "totp_credential" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "secret" varchar NOT NULL, "deviceName" varchar, "isVerified" boolean NOT NULL DEFAULT (0), "lastUsed" datetime)`);
        await queryRunner.query(`INSERT INTO "totp_credential"("createdDate", "modifiedDate", "deletedDate", "id", "userId", "secret", "deviceName", "isVerified", "lastUsed") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "userId", "secret", "deviceName", "isVerified", "lastUsed" FROM "temporary_totp_credential"`);
        await queryRunner.query(`DROP TABLE "temporary_totp_credential"`);
        await queryRunner.query(`ALTER TABLE "web_authn_credential" RENAME TO "temporary_web_authn_credential"`);
        await queryRunner.query(`CREATE TABLE "web_authn_credential" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "credentialId" varchar NOT NULL, "publicKey" varchar NOT NULL, "counter" integer NOT NULL DEFAULT (0), "deviceName" varchar, "transports" varchar, "lastUsed" datetime NOT NULL, CONSTRAINT "UQ_b0d9884eca4df9e50b3d7bad189" UNIQUE ("credentialId"))`);
        await queryRunner.query(`INSERT INTO "web_authn_credential"("createdDate", "modifiedDate", "deletedDate", "id", "userId", "credentialId", "publicKey", "counter", "deviceName", "transports", "lastUsed") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "userId", "credentialId", "publicKey", "counter", "deviceName", "transports", "lastUsed" FROM "temporary_web_authn_credential"`);
        await queryRunner.query(`DROP TABLE "temporary_web_authn_credential"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" RENAME TO "temporary_oauth_user"`);
        await queryRunner.query(`CREATE TABLE "oauth_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar NOT NULL, "grants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "oauth_user"("id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "username", "password", "email", "grants", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_oauth_user"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_user"`);
        await queryRunner.query(`DROP TABLE "recovery_code"`);
        await queryRunner.query(`DROP TABLE "totp_credential"`);
        await queryRunner.query(`DROP TABLE "web_authn_credential"`);
    }

}
