import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250509141230 implements MigrationInterface {
    name = 'Postgres20250509141230'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."transfer_event_dao_state_enum" RENAME TO "transfer_event_dao_state_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_event_dao_state_enum" AS ENUM('REQUESTED', 'STARTED', 'TERMINATED', 'COMPLETED', 'SUSPENDED')`);
        await queryRunner.query(`ALTER TABLE "transfer_event_dao" ALTER COLUMN "state" TYPE "public"."transfer_event_dao_state_enum" USING "state"::"text"::"public"."transfer_event_dao_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_event_dao_state_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."transfer_detail_dao_state_enum" RENAME TO "transfer_detail_dao_state_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_detail_dao_state_enum" AS ENUM('REQUESTED', 'STARTED', 'TERMINATED', 'COMPLETED', 'SUSPENDED')`);
        await queryRunner.query(`ALTER TABLE "transfer_detail_dao" ALTER COLUMN "state" TYPE "public"."transfer_detail_dao_state_enum" USING "state"::"text"::"public"."transfer_detail_dao_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_detail_dao_state_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."negotationProcessEvent_state_enum" RENAME TO "negotationProcessEvent_state_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."negotationProcessEvent_state_enum" AS ENUM('REQUESTED', 'OFFERED', 'ACCEPTED', 'AGREED', 'VERIFIED', 'FINALIZED', 'TERMINATED')`);
        await queryRunner.query(`ALTER TABLE "negotationProcessEvent" ALTER COLUMN "state" TYPE "public"."negotationProcessEvent_state_enum" USING "state"::"text"::"public"."negotationProcessEvent_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."negotationProcessEvent_state_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."negotiationDetail_state_enum" RENAME TO "negotiationDetail_state_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."negotiationDetail_state_enum" AS ENUM('REQUESTED', 'OFFERED', 'ACCEPTED', 'AGREED', 'VERIFIED', 'FINALIZED', 'TERMINATED')`);
        await queryRunner.query(`ALTER TABLE "negotiationDetail" ALTER COLUMN "state" TYPE "public"."negotiationDetail_state_enum" USING "state"::"text"::"public"."negotiationDetail_state_enum"`);
        await queryRunner.query(`DROP TYPE "public"."negotiationDetail_state_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."negotiationDetail_state_enum_old" AS ENUM('dspace:REQUESTED', 'dspace:OFFERED', 'dspace:ACCEPTED', 'dspace:AGREED', 'dspace:VERIFIED', 'dspace:FINALIZED', 'dspace:TERMINATED')`);
        await queryRunner.query(`ALTER TABLE "negotiationDetail" ALTER COLUMN "state" TYPE "public"."negotiationDetail_state_enum_old" USING "state"::"text"::"public"."negotiationDetail_state_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."negotiationDetail_state_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."negotiationDetail_state_enum_old" RENAME TO "negotiationDetail_state_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."negotationProcessEvent_state_enum_old" AS ENUM('dspace:REQUESTED', 'dspace:OFFERED', 'dspace:ACCEPTED', 'dspace:AGREED', 'dspace:VERIFIED', 'dspace:FINALIZED', 'dspace:TERMINATED')`);
        await queryRunner.query(`ALTER TABLE "negotationProcessEvent" ALTER COLUMN "state" TYPE "public"."negotationProcessEvent_state_enum_old" USING "state"::"text"::"public"."negotationProcessEvent_state_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."negotationProcessEvent_state_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."negotationProcessEvent_state_enum_old" RENAME TO "negotationProcessEvent_state_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_detail_dao_state_enum_old" AS ENUM('dspace:REQUESTED', 'dspace:STARTED', 'dspace:TERMINATED', 'dspace:COMPLETED', 'dspace:SUSPENDED')`);
        await queryRunner.query(`ALTER TABLE "transfer_detail_dao" ALTER COLUMN "state" TYPE "public"."transfer_detail_dao_state_enum_old" USING "state"::"text"::"public"."transfer_detail_dao_state_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_detail_dao_state_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transfer_detail_dao_state_enum_old" RENAME TO "transfer_detail_dao_state_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."transfer_event_dao_state_enum_old" AS ENUM('dspace:REQUESTED', 'dspace:STARTED', 'dspace:TERMINATED', 'dspace:COMPLETED', 'dspace:SUSPENDED')`);
        await queryRunner.query(`ALTER TABLE "transfer_event_dao" ALTER COLUMN "state" TYPE "public"."transfer_event_dao_state_enum_old" USING "state"::"text"::"public"."transfer_event_dao_state_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transfer_event_dao_state_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transfer_event_dao_state_enum_old" RENAME TO "transfer_event_dao_state_enum"`);
    }

}
