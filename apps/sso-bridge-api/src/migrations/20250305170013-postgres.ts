import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250305170013 implements MigrationInterface {
    name = 'Postgres20250305170013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "created"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "modified"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "deleted"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "createdDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "modifiedDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "deletedDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "authorizationRequest" text`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "completed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "userId" integer`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD CONSTRAINT "FK_f1462bf9279add899e91ff7489a" FOREIGN KEY ("userId") REFERENCES "oauth_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP CONSTRAINT "FK_f1462bf9279add899e91ff7489a"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "completed"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "authorizationRequest"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "deletedDate"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "modifiedDate"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" DROP COLUMN "createdDate"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "deleted" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "modified" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" ADD "created" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
