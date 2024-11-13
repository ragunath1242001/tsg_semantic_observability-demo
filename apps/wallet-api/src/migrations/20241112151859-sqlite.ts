import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20241112151859 implements MigrationInterface {
    name = 'Sqlite20241112151859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "key_materials" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "default" boolean NOT NULL, "privateKey" text NOT NULL, "publicKey" text NOT NULL, "caChain" varchar)`);
        await queryRunner.query(`CREATE TABLE "credentials" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "did_documents" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "document" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "did_service" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "serviceEndpoint" varchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "did_logs" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "scid" varchar NOT NULL, "logEntry" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "jsonld_context" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "credentialType" varchar NOT NULL, "issuable" boolean NOT NULL, "documentUrl" varchar, "document" text, "schema" text)`);
        await queryRunner.query(`CREATE TABLE "si_token" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar, "audience" varchar NOT NULL, "scope" varchar)`);
        await queryRunner.query(`CREATE TABLE "credential_issuance" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "preAuthorizedCode" varchar NOT NULL, "holderId" varchar NOT NULL, "credentialType" varchar NOT NULL, "credentialId" varchar, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"))`);
        await queryRunner.query(`CREATE TABLE "ci_access_token" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "access_token" varchar PRIMARY KEY NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "nonce" varchar NOT NULL, "issuanceId" integer)`);
        await queryRunner.query(`CREATE TABLE "temporary_ci_access_token" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "access_token" varchar PRIMARY KEY NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "nonce" varchar NOT NULL, "issuanceId" integer, CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_ci_access_token"("created", "modified", "deleted", "access_token", "expires_at", "refresh_token", "nonce", "issuanceId") SELECT "created", "modified", "deleted", "access_token", "expires_at", "refresh_token", "nonce", "issuanceId" FROM "ci_access_token"`);
        await queryRunner.query(`DROP TABLE "ci_access_token"`);
        await queryRunner.query(`ALTER TABLE "temporary_ci_access_token" RENAME TO "ci_access_token"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" RENAME TO "temporary_ci_access_token"`);
        await queryRunner.query(`CREATE TABLE "ci_access_token" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "access_token" varchar PRIMARY KEY NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "nonce" varchar NOT NULL, "issuanceId" integer)`);
        await queryRunner.query(`INSERT INTO "ci_access_token"("created", "modified", "deleted", "access_token", "expires_at", "refresh_token", "nonce", "issuanceId") SELECT "created", "modified", "deleted", "access_token", "expires_at", "refresh_token", "nonce", "issuanceId" FROM "temporary_ci_access_token"`);
        await queryRunner.query(`DROP TABLE "temporary_ci_access_token"`);
        await queryRunner.query(`DROP TABLE "ci_access_token"`);
        await queryRunner.query(`DROP TABLE "credential_issuance"`);
        await queryRunner.query(`DROP TABLE "si_token"`);
        await queryRunner.query(`DROP TABLE "jsonld_context"`);
        await queryRunner.query(`DROP TABLE "did_logs"`);
        await queryRunner.query(`DROP TABLE "did_service"`);
        await queryRunner.query(`DROP TABLE "did_documents"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
        await queryRunner.query(`DROP TABLE "key_materials"`);
    }

}
