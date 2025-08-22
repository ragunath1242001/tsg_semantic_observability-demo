import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250819135053 implements MigrationInterface {
    name = 'Postgres20250819135053'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dataset_dao" ("identifier" character varying NOT NULL, "dataset" text NOT NULL, CONSTRAINT "PK_9fb98c8aa63b0528091e714c4a4" PRIMARY KEY ("identifier"))`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP COLUMN "dataset"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD "dataset" text NOT NULL`);
        await queryRunner.query(`DROP TABLE "dataset_dao"`);
    }

}
