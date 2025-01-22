import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250122115241 implements MigrationInterface {
    name = 'Sqlite20250122115241'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "status_list_credential_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "revoked" text NOT NULL, "full" boolean NOT NULL, "credentialId" varchar, CONSTRAINT "REL_20ce7613497c20b7cceabe6815" UNIQUE ("credentialId"))`);
        await queryRunner.query(`CREATE TABLE "temporary_credentials" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_credentials"("created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued") SELECT "created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued" FROM "credentials"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
        await queryRunner.query(`ALTER TABLE "temporary_credentials" RENAME TO "credentials"`);
        await queryRunner.query(`CREATE TABLE "temporary_credentials" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar, CONSTRAINT "FK_9bf957e3dd684407894be5c912b" FOREIGN KEY ("statusListCredentialId") REFERENCES "status_list_credential_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_credentials"("created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId") SELECT "created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId" FROM "credentials"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
        await queryRunner.query(`ALTER TABLE "temporary_credentials" RENAME TO "credentials"`);
        await queryRunner.query(`CREATE TABLE "temporary_status_list_credential_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "revoked" text NOT NULL, "full" boolean NOT NULL, "credentialId" varchar, CONSTRAINT "REL_20ce7613497c20b7cceabe6815" UNIQUE ("credentialId"), CONSTRAINT "FK_20ce7613497c20b7cceabe68154" FOREIGN KEY ("credentialId") REFERENCES "credentials" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_status_list_credential_dao"("created", "modified", "deleted", "id", "revoked", "full", "credentialId") SELECT "created", "modified", "deleted", "id", "revoked", "full", "credentialId" FROM "status_list_credential_dao"`);
        await queryRunner.query(`DROP TABLE "status_list_credential_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_status_list_credential_dao" RENAME TO "status_list_credential_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "status_list_credential_dao" RENAME TO "temporary_status_list_credential_dao"`);
        await queryRunner.query(`CREATE TABLE "status_list_credential_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "revoked" text NOT NULL, "full" boolean NOT NULL, "credentialId" varchar, CONSTRAINT "REL_20ce7613497c20b7cceabe6815" UNIQUE ("credentialId"))`);
        await queryRunner.query(`INSERT INTO "status_list_credential_dao"("created", "modified", "deleted", "id", "revoked", "full", "credentialId") SELECT "created", "modified", "deleted", "id", "revoked", "full", "credentialId" FROM "temporary_status_list_credential_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_status_list_credential_dao"`);
        await queryRunner.query(`ALTER TABLE "credentials" RENAME TO "temporary_credentials"`);
        await queryRunner.query(`CREATE TABLE "credentials" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, "revoked" boolean NOT NULL DEFAULT (0), "statusListIndex" integer, "statusListCredentialId" varchar)`);
        await queryRunner.query(`INSERT INTO "credentials"("created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId") SELECT "created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued", "revoked", "statusListIndex", "statusListCredentialId" FROM "temporary_credentials"`);
        await queryRunner.query(`DROP TABLE "temporary_credentials"`);
        await queryRunner.query(`ALTER TABLE "credentials" RENAME TO "temporary_credentials"`);
        await queryRunner.query(`CREATE TABLE "credentials" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "id" varchar PRIMARY KEY NOT NULL, "targetDid" varchar NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL)`);
        await queryRunner.query(`INSERT INTO "credentials"("created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued") SELECT "created", "modified", "deleted", "id", "targetDid", "credential", "selfIssued" FROM "temporary_credentials"`);
        await queryRunner.query(`DROP TABLE "temporary_credentials"`);
        await queryRunner.query(`DROP TABLE "status_list_credential_dao"`);
    }

}
