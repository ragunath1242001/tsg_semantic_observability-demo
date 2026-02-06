import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260202165047 implements MigrationInterface {
    name = 'Sqlite20260202165047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_authorization_request_dao" ("id" varchar PRIMARY KEY NOT NULL, "dcqlQuery" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_authorization_request_dao"("id", "dcqlQuery", "nonce", "createdDate", "modifiedDate", "deletedDate") SELECT "identifier", "dcqlQuery", "nonce", "createdDate", "modifiedDate", "deletedDate" FROM "authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_authorization_request_dao" RENAME TO "authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_credentials" ("id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "proof" text, "jwt" varchar, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar, CONSTRAINT "FK_9bf957e3dd684407894be5c912b" FOREIGN KEY ("statusListCredentialId") REFERENCES "status_list_credential_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_credentials"("id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate", "proof", "jwt") SELECT "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate", "proof", "jwt" FROM "credentials"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
        await queryRunner.query(`ALTER TABLE "temporary_credentials" RENAME TO "credentials"`);
        await queryRunner.query(`CREATE TABLE "temporary_ci_access_token" ("access_token" varchar NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "issuanceId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar NOT NULL, CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("access_token", "id"))`);
        await queryRunner.query(`INSERT INTO "temporary_ci_access_token"("access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate") SELECT "access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate" FROM "ci_access_token"`);
        await queryRunner.query(`DROP TABLE "ci_access_token"`);
        await queryRunner.query(`ALTER TABLE "temporary_ci_access_token" RENAME TO "ci_access_token"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" RENAME TO "temporary_ci_access_token"`);
        await queryRunner.query(`CREATE TABLE "ci_access_token" ("access_token" varchar PRIMARY KEY NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "issuanceId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "ci_access_token"("access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate") SELECT "access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_ci_access_token"`);
        await queryRunner.query(`DROP TABLE "temporary_ci_access_token"`);
        await queryRunner.query(`ALTER TABLE "credentials" RENAME TO "temporary_credentials"`);
        await queryRunner.query(`CREATE TABLE "credentials" ("id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "proof" text, "jwt" varchar, CONSTRAINT "FK_9bf957e3dd684407894be5c912b" FOREIGN KEY ("statusListCredentialId") REFERENCES "status_list_credential_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "credentials"("id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate", "proof", "jwt") SELECT "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate", "proof", "jwt" FROM "temporary_credentials"`);
        await queryRunner.query(`DROP TABLE "temporary_credentials"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME TO "temporary_authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "dcqlQuery" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "authorization_request_dao"("identifier", "dcqlQuery", "nonce", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "dcqlQuery", "nonce", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_authorization_request_dao"`);
    }

}
