import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250721141118 implements MigrationInterface {
    name = 'Sqlite20250721141118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_registry" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "catalogId" varchar NOT NULL, "catalogJson" text NOT NULL, "participantId" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_registry"("createdDate", "modifiedDate", "deletedDate", "id", "catalogId", "catalogJson") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "catalogId", "catalogJson" FROM "registry"`);
        await queryRunner.query(`DROP TABLE "registry"`);
        await queryRunner.query(`ALTER TABLE "temporary_registry" RENAME TO "registry"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registry" RENAME TO "temporary_registry"`);
        await queryRunner.query(`CREATE TABLE "registry" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "catalogId" varchar NOT NULL, "catalogJson" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "registry"("createdDate", "modifiedDate", "deletedDate", "id", "catalogId", "catalogJson") SELECT "createdDate", "modifiedDate", "deletedDate", "id", "catalogId", "catalogJson" FROM "temporary_registry"`);
        await queryRunner.query(`DROP TABLE "temporary_registry"`);
    }

}
