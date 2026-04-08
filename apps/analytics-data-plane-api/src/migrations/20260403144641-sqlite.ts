import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260403144641 implements MigrationInterface {
    name = 'Sqlite20260403144641'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "projectAgreementId" varchar, "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar, "orchestrationStatus" varchar, "isInitiator" boolean, "participantStatuses" text, CONSTRAINT "FK_e16dc2433aa04af491c0def4571" FOREIGN KEY ("projectAgreementId") REFERENCES "project_agreement_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "projectAgreementId", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "projectAgreementId", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId" FROM "algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_algorithm_instance_dao" RENAME TO "algorithm_instance_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" RENAME TO "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "projectAgreementId" varchar, "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "ownerId" varchar, "ownerIdentifier" varchar, "createdBy" varchar, "tenantId" varchar, CONSTRAINT "FK_e16dc2433aa04af491c0def4571" FOREIGN KEY ("projectAgreementId") REFERENCES "project_agreement_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "projectAgreementId", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "projectAgreementId", "modifiedDate", "deletedDate", "ownerId", "ownerIdentifier", "createdBy", "tenantId" FROM "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_algorithm_instance_dao"`);
    }

}
