import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20251027133448 implements MigrationInterface {
    name = 'Sqlite20251027133448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_data_plane_state_dao" ("identifier" varchar NOT NULL, "details" text NOT NULL, "_id" integer NOT NULL, PRIMARY KEY ("identifier", "_id"))`);
        await queryRunner.query(`INSERT INTO "temporary_data_plane_state_dao"("identifier", "details") SELECT "identifier", "details" FROM "data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_data_plane_state_dao" RENAME TO "data_plane_state_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_data_plane_state_dao" ("identifier" varchar NOT NULL, "details" text NOT NULL, "_id" integer PRIMARY KEY NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_data_plane_state_dao"("identifier", "details", "_id") SELECT "identifier", "details", "_id" FROM "data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "data_plane_state_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_data_plane_state_dao" RENAME TO "data_plane_state_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" RENAME TO "temporary_data_plane_state_dao"`);
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" varchar NOT NULL, "details" text NOT NULL, "_id" integer NOT NULL, PRIMARY KEY ("identifier", "_id"))`);
        await queryRunner.query(`INSERT INTO "data_plane_state_dao"("identifier", "details", "_id") SELECT "identifier", "details", "_id" FROM "temporary_data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_data_plane_state_dao"`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" RENAME TO "temporary_data_plane_state_dao"`);
        await queryRunner.query(`CREATE TABLE "data_plane_state_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "details" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "data_plane_state_dao"("identifier", "details") SELECT "identifier", "details" FROM "temporary_data_plane_state_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_data_plane_state_dao"`);
    }

}
