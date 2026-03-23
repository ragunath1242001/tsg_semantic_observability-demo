import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260318133903 implements MigrationInterface {
    name = 'Sqlite20260318133903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_log" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "timestamp" datetime NOT NULL DEFAULT (datetime('now')), "severity" varchar NOT NULL, "correlationId" varchar, "callerSub" varchar NOT NULL, "callerType" varchar NOT NULL, "callerServiceName" varchar, "callerUsername" varchar, "callerDidId" varchar, "onBehalfOfSub" varchar, "onBehalfOfUsername" varchar, "onBehalfOfDidId" varchar, "delegationChain" text, "action" varchar NOT NULL, "resourceType" varchar NOT NULL, "resourceId" varchar, "ipAddress" varchar, "userAgent" varchar, "requestPath" varchar, "requestMethod" varchar, "resultAllowed" boolean NOT NULL, "resultReason" varchar, "resultMatchedPermission" varchar, "resultEffectiveScope" varchar)`);
        await queryRunner.query(`CREATE INDEX "IDX_e37c3ea653e1ca958e4114a0bc" ON "audit_log" ("resultAllowed") `);
        await queryRunner.query(`CREATE INDEX "IDX_76442a50bfb2fd3c7bb96fc704" ON "audit_log" ("resourceType") `);
        await queryRunner.query(`CREATE INDEX "IDX_951e6339a77994dfbad976b35c" ON "audit_log" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_9524c6b6540baae8cf562fbed0" ON "audit_log" ("callerSub") `);
        await queryRunner.query(`CREATE INDEX "IDX_18fb0c7ae9a224cb46bf130b9f" ON "audit_log" ("severity") `);
        await queryRunner.query(`CREATE INDEX "IDX_2651664897b82bcfb8975552c6" ON "audit_log" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_2651664897b82bcfb8975552c6"`);
        await queryRunner.query(`DROP INDEX "IDX_18fb0c7ae9a224cb46bf130b9f"`);
        await queryRunner.query(`DROP INDEX "IDX_9524c6b6540baae8cf562fbed0"`);
        await queryRunner.query(`DROP INDEX "IDX_951e6339a77994dfbad976b35c"`);
        await queryRunner.query(`DROP INDEX "IDX_76442a50bfb2fd3c7bb96fc704"`);
        await queryRunner.query(`DROP INDEX "IDX_e37c3ea653e1ca958e4114a0bc"`);
        await queryRunner.query(`DROP TABLE "audit_log"`);
    }

}
