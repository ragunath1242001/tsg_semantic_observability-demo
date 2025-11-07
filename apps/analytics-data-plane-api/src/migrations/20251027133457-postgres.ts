import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20251027133457 implements MigrationInterface {
    name = 'Postgres20251027133457'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD "_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP CONSTRAINT "PK_08b95c167b2cd0e9ac9fa0574c6"`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD CONSTRAINT "PK_bc034edcd9ecedb360291e9a176" PRIMARY KEY ("identifier", "_id")`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP CONSTRAINT "PK_bc034edcd9ecedb360291e9a176"`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD CONSTRAINT "PK_9318f5e3af26b32d964bf144068" PRIMARY KEY ("_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP CONSTRAINT "PK_9318f5e3af26b32d964bf144068"`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD CONSTRAINT "PK_bc034edcd9ecedb360291e9a176" PRIMARY KEY ("identifier", "_id")`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP CONSTRAINT "PK_bc034edcd9ecedb360291e9a176"`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" ADD CONSTRAINT "PK_08b95c167b2cd0e9ac9fa0574c6" PRIMARY KEY ("identifier")`);
        await queryRunner.query(`ALTER TABLE "data_plane_state_dao" DROP COLUMN "_id"`);
    }

}
