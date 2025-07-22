import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250715150503 implements MigrationInterface {
    name = 'Postgres20250715150503'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME COLUMN "presentationDefinition" TO "dcqlQuery"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME COLUMN "dcqlQuery" TO "presentationDefinition"`);
    }

}
