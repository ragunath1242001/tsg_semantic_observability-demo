import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250313110856 implements MigrationInterface {
    name = 'Sqlite20250313110856'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_credential_issuance" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "remoteId" varchar, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`INSERT INTO "temporary_credential_issuance"("id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject", "createdDate", "modifiedDate", "deletedDate" FROM "credential_issuance"`);
        await queryRunner.query(`DROP TABLE "credential_issuance"`);
        await queryRunner.query(`ALTER TABLE "temporary_credential_issuance" RENAME TO "credential_issuance"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential_issuance" RENAME TO "temporary_credential_issuance"`);
        await queryRunner.query(`CREATE TABLE "credential_issuance" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`INSERT INTO "credential_issuance"("id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "preAuthorizedCode", "holderId", "credentialType", "credentialId", "revoked", "credentialSubject", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_credential_issuance"`);
        await queryRunner.query(`DROP TABLE "temporary_credential_issuance"`);
    }

}
