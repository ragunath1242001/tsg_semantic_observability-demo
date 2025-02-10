import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250207144554 implements MigrationInterface {
    name = 'Sqlite20250207144554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_credential_issuance" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar NOT NULL, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`INSERT INTO "temporary_credential_issuance"("created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject") SELECT "created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject" FROM "credential_issuance"`);
        await queryRunner.query(`DROP TABLE "credential_issuance"`);
        await queryRunner.query(`ALTER TABLE "temporary_credential_issuance" RENAME TO "credential_issuance"`);
        await queryRunner.query(`CREATE TABLE "temporary_credential_issuance" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`INSERT INTO "temporary_credential_issuance"("created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject") SELECT "created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject" FROM "credential_issuance"`);
        await queryRunner.query(`DROP TABLE "credential_issuance"`);
        await queryRunner.query(`ALTER TABLE "temporary_credential_issuance" RENAME TO "credential_issuance"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential_issuance" RENAME TO "temporary_credential_issuance"`);
        await queryRunner.query(`CREATE TABLE "credential_issuance" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar NOT NULL, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`INSERT INTO "credential_issuance"("created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject") SELECT "created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject" FROM "temporary_credential_issuance"`);
        await queryRunner.query(`DROP TABLE "temporary_credential_issuance"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" RENAME TO "temporary_credential_issuance"`);
        await queryRunner.query(`CREATE TABLE "credential_issuance" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar NOT NULL, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`INSERT INTO "credential_issuance"("created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject") SELECT "created", "modified", "deleted", "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject" FROM "temporary_credential_issuance"`);
        await queryRunner.query(`DROP TABLE "temporary_credential_issuance"`);
    }

}
