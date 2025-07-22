import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250717145828 implements MigrationInterface {
    name = 'Postgres20250717145828'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "presentationDefinition"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "dcqlQuery" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "response_mode" character varying`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "response_type" character varying`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "response_uri" character varying`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "request" character varying`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "request_uri" character varying`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "client_metadata" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "client_metadata"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "request_uri"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "request"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "response_uri"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "response_type"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "response_mode"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "dcqlQuery"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "presentationDefinition" text NOT NULL`);
    }

}
