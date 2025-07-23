import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250721141118 implements MigrationInterface {
    name = 'Postgres20250721141118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registry" ADD "participantId" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registry" DROP COLUMN "participantId"`);
    }

}
