import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250721142652 implements MigrationInterface {
    name = 'Sqlite20250721142652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_oauth_role" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL, "isAdminRole" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_oauth_role"("createdDate", "modifiedDate", "deletedDate", "id", "name", "description") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "name", "description" FROM "oauth_role"`);
        await queryRunner.query(`DROP TABLE "oauth_role"`);
        await queryRunner.query(`ALTER TABLE "temporary_oauth_role" RENAME TO "oauth_role"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_role" RENAME TO "temporary_oauth_role"`);
        await queryRunner.query(`CREATE TABLE "oauth_role" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "description" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "oauth_role"("createdDate", "modifiedDate", "deletedDate", "id", "name", "description") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "name", "description" FROM "temporary_oauth_role"`);
        await queryRunner.query(`DROP TABLE "temporary_oauth_role"`);
    }

}
