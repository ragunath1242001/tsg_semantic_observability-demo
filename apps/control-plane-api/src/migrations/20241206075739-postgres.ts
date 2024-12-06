import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20241206075739 implements MigrationInterface {
    name = 'Postgres20241206075739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "constraint_dao" ADD "createdDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "constraint_dao" ADD "modifiedDate" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "constraint_dao" ADD "deletedDate" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "constraint_dao" DROP COLUMN "deletedDate"`);
        await queryRunner.query(`ALTER TABLE "constraint_dao" DROP COLUMN "modifiedDate"`);
        await queryRunner.query(`ALTER TABLE "constraint_dao" DROP COLUMN "createdDate"`);
    }

}
