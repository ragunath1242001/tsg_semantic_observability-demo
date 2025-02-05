import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250203142648 implements MigrationInterface {
    name = 'Sqlite20250203142648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dataset_item_dao" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "version" varchar NOT NULL, "backendUrl" varchar NOT NULL, "authorization" varchar, "mediaType" varchar, "schemaRef" varchar, "openApiSpecRef" varchar, "policy" text, "dataset" text)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "dataset_item_dao"`);
    }

}
