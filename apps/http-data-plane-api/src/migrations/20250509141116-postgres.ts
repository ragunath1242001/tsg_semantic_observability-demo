import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250509141116 implements MigrationInterface {
    name = 'Postgres20250509141116'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."transfer_dao_state_enum" RENAME TO "transfer_dao_state_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_dao_state_enum" AS ENUM('REQUESTED', 'STARTED', 'TERMINATED', 'COMPLETED', 'SUSPENDED')`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ALTER COLUMN "state" TYPE "public"."transfer_dao_state_enum" USING "state"::"text"::"public"."transfer_dao_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_dao_state_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transfer_dao_state_enum_old" AS ENUM('dspace:REQUESTED', 'dspace:STARTED', 'dspace:TERMINATED', 'dspace:COMPLETED', 'dspace:SUSPENDED')`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ALTER COLUMN "state" TYPE "public"."transfer_dao_state_enum_old" USING "state"::"text"::"public"."transfer_dao_state_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_dao_state_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transfer_dao_state_enum_old" RENAME TO "transfer_dao_state_enum"`);
    }

}
