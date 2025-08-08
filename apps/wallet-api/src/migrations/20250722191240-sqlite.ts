import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250722191240 implements MigrationInterface {
    name = 'Sqlite20250722191240'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_credentials" ("id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "proof" text, "jwt" varchar, CONSTRAINT "FK_9bf957e3dd684407894be5c912b" FOREIGN KEY ("statusListCredentialId") REFERENCES "status_list_credential_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_credentials"("id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate" FROM "credentials"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
        await queryRunner.query(`ALTER TABLE "temporary_credentials" RENAME TO "credentials"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credentials" RENAME TO "temporary_credentials"`);
        await queryRunner.query(`CREATE TABLE "credentials" ("id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, CONSTRAINT "FK_9bf957e3dd684407894be5c912b" FOREIGN KEY ("statusListCredentialId") REFERENCES "status_list_credential_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "credentials"("id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate") SELECT "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_credentials"`);
        await queryRunner.query(`DROP TABLE "temporary_credentials"`);
    }

}
