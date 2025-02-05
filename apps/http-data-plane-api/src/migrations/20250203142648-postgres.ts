import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250203142648 implements MigrationInterface {
    name = 'Postgres20250203142648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dataset_item_dao" ("id" character varying NOT NULL, "title" character varying NOT NULL, "version" character varying NOT NULL, "backendUrl" character varying NOT NULL, "authorization" character varying, "mediaType" character varying, "schemaRef" character varying, "openApiSpecRef" character varying, "policy" text, "dataset" text, CONSTRAINT "PK_eae68a873354fa03576c6596cca" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "dataset_item_dao"`);
    }

}
