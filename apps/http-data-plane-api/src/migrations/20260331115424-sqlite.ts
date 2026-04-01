import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260331115424 implements MigrationInterface {
    name = 'Sqlite20260331115424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_dataset_item_dao" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "version" varchar NOT NULL, "backendUrl" varchar NOT NULL, "authorization" varchar, "mediaType" varchar, "schemaRef" varchar, "openApiSpecRef" varchar, "policy" text, "dataset" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar, "description" text, "extraProps" text)`);
        await queryRunner.query(`INSERT INTO "temporary_dataset_item_dao"("id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId") SELECT "id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId" FROM "dataset_item_dao"`);
        await queryRunner.query(`DROP TABLE "dataset_item_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_dataset_item_dao" RENAME TO "dataset_item_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dataset_item_dao" RENAME TO "temporary_dataset_item_dao"`);
        await queryRunner.query(`CREATE TABLE "dataset_item_dao" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "version" varchar NOT NULL, "backendUrl" varchar NOT NULL, "authorization" varchar, "mediaType" varchar, "schemaRef" varchar, "openApiSpecRef" varchar, "policy" text, "dataset" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar)`);
        await queryRunner.query(`INSERT INTO "dataset_item_dao"("id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId") SELECT "id", "title", "version", "backendUrl", "authorization", "mediaType", "schemaRef", "openApiSpecRef", "policy", "dataset", "createdDate", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId" FROM "temporary_dataset_item_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_dataset_item_dao"`);
    }

}
