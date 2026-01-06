import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260105163604 implements MigrationInterface {
    name = 'Sqlite20260105163604'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "originalFileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text, "mediaType" varchar NOT NULL, "datasetId" varchar, "metadataStatus" varchar NOT NULL DEFAULT ('pending'), "metadataError" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_metadata"("identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId") SELECT "identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId" FROM "metadata"`);
        await queryRunner.query(`DROP TABLE "metadata"`);
        await queryRunner.query(`ALTER TABLE "temporary_metadata" RENAME TO "metadata"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metadata" RENAME TO "temporary_metadata"`);
        await queryRunner.query(`CREATE TABLE "metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "originalFileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text, "mediaType" varchar NOT NULL, "datasetId" varchar)`);
        await queryRunner.query(`INSERT INTO "metadata"("identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId") SELECT "identifier", "fileSizeInBytes", "fileName", "originalFileName", "presentInLastCheck", "csvw", "mediaType", "datasetId" FROM "temporary_metadata"`);
        await queryRunner.query(`DROP TABLE "temporary_metadata"`);
    }

}
