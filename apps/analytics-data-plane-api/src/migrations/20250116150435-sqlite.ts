import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250116150435 implements MigrationInterface {
  name = "Sqlite20250116150435";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL, "csvw" text)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_metadata"("identifier", "fileSizeInBytes", "fileName", "presentInLastCheck") SELECT "identifier", "fileSizeInBytes", "fileName", "presentInLastCheck" FROM "metadata"`
    );
    await queryRunner.query(`DROP TABLE "metadata"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_metadata" RENAME TO "metadata"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "metadata" RENAME TO "temporary_metadata"`
    );
    await queryRunner.query(
      `CREATE TABLE "metadata" ("identifier" varchar PRIMARY KEY NOT NULL, "fileSizeInBytes" integer NOT NULL, "fileName" varchar NOT NULL, "presentInLastCheck" boolean NOT NULL)`
    );
    await queryRunner.query(
      `INSERT INTO "metadata"("identifier", "fileSizeInBytes", "fileName", "presentInLastCheck") SELECT "identifier", "fileSizeInBytes", "fileName", "presentInLastCheck" FROM "temporary_metadata"`
    );
    await queryRunner.query(`DROP TABLE "temporary_metadata"`);
  }
}
