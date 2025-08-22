import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250821125903 implements MigrationInterface {
    name = 'Postgres20250821125903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "versioned_dataset_dao" ("identifier" character varying NOT NULL, "dataset" text NOT NULL, CONSTRAINT "PK_6a48a6059338ebdfab151520a8b" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP COLUMN "dataset"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD "dataset" text NOT NULL`);
        await queryRunner.query(`DROP TABLE "versioned_dataset_dao"`);
    }

}
