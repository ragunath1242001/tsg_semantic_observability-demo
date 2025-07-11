import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250707120530 implements MigrationInterface {
    name = 'Sqlite20250707120530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "issue_configuration" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "credentialType" varchar NOT NULL, "documentUrl" varchar, "document" text, "schema" text, "name" varchar, "description" varchar, "backgroundColor" varchar, "backgroundImage" varchar, "textColor" varchar)`);
        await queryRunner.query(`CREATE TABLE "temporary_ci_access_token" ("access_token" varchar PRIMARY KEY NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "issuanceId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_ci_access_token"("access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate") SELECT "access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate" FROM "ci_access_token"`);
        await queryRunner.query(`DROP TABLE "ci_access_token"`);
        await queryRunner.query(`ALTER TABLE "temporary_ci_access_token" RENAME TO "ci_access_token"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" RENAME TO "temporary_ci_access_token"`);
        await queryRunner.query(`CREATE TABLE "ci_access_token" ("access_token" varchar PRIMARY KEY NOT NULL, "expires_at" datetime NOT NULL, "refresh_token" varchar NOT NULL, "nonce" varchar NOT NULL, "issuanceId" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "ci_access_token"("access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate") SELECT "access_token", "expires_at", "refresh_token", "issuanceId", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_ci_access_token"`);
        await queryRunner.query(`DROP TABLE "temporary_ci_access_token"`);
        await queryRunner.query(`DROP TABLE "issue_configuration"`);
    }

}
