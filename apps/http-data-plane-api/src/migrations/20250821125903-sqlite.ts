import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250821125903 implements MigrationInterface {
    name = 'Sqlite20250821125903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "versioned_dataset_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "dataset" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "temporary_data_plane_state_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "managementToken" varchar NOT NULL, "details" text NOT NULL, "datasetConfig" text)`);
        await queryRunner.query(`INSERT INTO "temporary_data_plane_state_dao"("identifier", "managementToken", "details", "datasetConfig") SELECT "identifier", "managementToken", "details", "datasetConfig" FROM "data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_data_plane_state_dao" RENAME TO "data_plane_state_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" RENAME TO "temporary_data_plane_state_dao"`);
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "managementToken" varchar NOT NULL, "details" text NOT NULL, "datasetConfig" text, "dataset" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "data_plane_state_dao"("identifier", "managementToken", "details", "datasetConfig") SELECT "identifier", "managementToken", "details", "datasetConfig" FROM "temporary_data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "versioned_dataset_dao"`);
    }

}
