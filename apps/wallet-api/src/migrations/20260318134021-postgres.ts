import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260318134021 implements MigrationInterface {
    name = 'Postgres20260318134021'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_log" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "severity" character varying NOT NULL, "correlationId" character varying, "callerSub" character varying NOT NULL, "callerType" character varying NOT NULL, "callerServiceName" character varying, "callerUsername" character varying, "callerDidId" character varying, "onBehalfOfSub" character varying, "onBehalfOfUsername" character varying, "onBehalfOfDidId" character varying, "delegationChain" text, "action" character varying NOT NULL, "resourceType" character varying NOT NULL, "resourceId" character varying, "ipAddress" character varying, "userAgent" character varying, "requestPath" character varying, "requestMethod" character varying, "resultAllowed" boolean NOT NULL, "resultReason" character varying, "resultMatchedPermission" character varying, "resultEffectiveScope" character varying, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e37c3ea653e1ca958e4114a0bc" ON "audit_log" ("resultAllowed") `);
        await queryRunner.query(`CREATE INDEX "IDX_76442a50bfb2fd3c7bb96fc704" ON "audit_log" ("resourceType") `);
        await queryRunner.query(`CREATE INDEX "IDX_951e6339a77994dfbad976b35c" ON "audit_log" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_9524c6b6540baae8cf562fbed0" ON "audit_log" ("callerSub") `);
        await queryRunner.query(`CREATE INDEX "IDX_18fb0c7ae9a224cb46bf130b9f" ON "audit_log" ("severity") `);
        await queryRunner.query(`CREATE INDEX "IDX_2651664897b82bcfb8975552c6" ON "audit_log" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2651664897b82bcfb8975552c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18fb0c7ae9a224cb46bf130b9f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9524c6b6540baae8cf562fbed0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_951e6339a77994dfbad976b35c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76442a50bfb2fd3c7bb96fc704"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e37c3ea653e1ca958e4114a0bc"`);
        await queryRunner.query(`DROP TABLE "audit_log"`);
    }

}
