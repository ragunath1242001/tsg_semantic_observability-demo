import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260128160118 implements MigrationInterface {
    name = 'Sqlite20260128160118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "originalFileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text, "mediaType" varchar NOT NULL, "datasetId" varchar, "metadataStatus" varchar NOT NULL DEFAULT ('pending'), "metadataError" varchar, "inlineCsvw" boolean)`);
        await queryRunner.query(`INSERT INTO "temporary_metadata"("identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId", "metadataStatus", "metadataError") SELECT "identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId", "metadataStatus", "metadataError" FROM "metadata"`);
        await queryRunner.query(`DROP TABLE "metadata"`);
        await queryRunner.query(`ALTER TABLE "temporary_metadata" RENAME TO "metadata"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" RENAME TO "temporary_metadata"`);
        await queryRunner.query(`CREATE TABLE "metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "originalFileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text, "mediaType" varchar NOT NULL, "datasetId" varchar, "metadataStatus" varchar NOT NULL DEFAULT ('pending'), "metadataError" varchar)`);
        await queryRunner.query(`INSERT INTO "metadata"("identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId", "metadataStatus", "metadataError") SELECT "identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId", "metadataStatus", "metadataError" FROM "temporary_metadata"`);
        await queryRunner.query(`DROP TABLE "temporary_metadata"`);
    }

}
