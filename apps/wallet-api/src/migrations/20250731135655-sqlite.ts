import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250731135655 implements MigrationInterface {
    name = 'Sqlite20250731135655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_issue_configuration" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "credentialType" varchar NOT NULL, "documentUrl" varchar, "document" text, "schema" text, "name" varchar, "description" varchar, "backgroundColor" varchar, "backgroundImage" varchar, "textColor" varchar, "proofType" varchar NOT NULL DEFAULT ('jwt'))`);
        await queryRunner.query(`INSERT INTO "temporary_issue_configuration"("createdDate", "modifiedDate", "deletedDate", "id", "credentialType", "documentUrl", "document", "schema", "name", "description", "backgroundColor", "backgroundImage", "textColor") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "credentialType", "documentUrl", "document", "schema", "name", "description", "backgroundColor", "backgroundImage", "textColor" FROM "issue_configuration"`);
        await queryRunner.query(`DROP TABLE "issue_configuration"`);
        await queryRunner.query(`ALTER TABLE "temporary_issue_configuration" RENAME TO "issue_configuration"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issue_configuration" RENAME TO "temporary_issue_configuration"`);
        await queryRunner.query(`CREATE TABLE "issue_configuration" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "credentialType" varchar NOT NULL, "documentUrl" varchar, "document" text, "schema" text, "name" varchar, "description" varchar, "backgroundColor" varchar, "backgroundImage" varchar, "textColor" varchar)`);
        await queryRunner.query(`INSERT INTO "issue_configuration"("createdDate", "modifiedDate", "deletedDate", "id", "credentialType", "documentUrl", "document", "schema", "name", "description", "backgroundColor", "backgroundImage", "textColor") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "credentialType", "documentUrl", "document", "schema", "name", "description", "backgroundColor", "backgroundImage", "textColor" FROM "temporary_issue_configuration"`);
        await queryRunner.query(`DROP TABLE "temporary_issue_configuration"`);
    }

}
