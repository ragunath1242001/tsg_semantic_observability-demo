import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20251210110352 implements MigrationInterface {
    name = 'Sqlite20251210110352'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar, "projectAgreementId" integer, CONSTRAINT "FK_6fd0401a16eab13575446a07fe7" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId" FROM "algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_algorithm_instance_dao" RENAME TO "algorithm_instance_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar, "projectAgreementId" integer, CONSTRAINT "FK_6fd0401a16eab13575446a07fe7" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_e16dc2433aa04af491c0def4571" FOREIGN KEY ("projectAgreementId") REFERENCES "project_agreement_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId", "projectAgreementId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId", "projectAgreementId" FROM "algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_algorithm_instance_dao" RENAME TO "algorithm_instance_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" RENAME TO "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar, "projectAgreementId" integer, CONSTRAINT "FK_6fd0401a16eab13575446a07fe7" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId", "projectAgreementId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId", "projectAgreementId" FROM "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`ALTER TABLE "algorithm_instance_dao" RENAME TO "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`CREATE TABLE "algorithm_instance_dao" ("id" varchar PRIMARY KEY NOT NULL, "algorithmDefinition" text NOT NULL, "participants" text NOT NULL, "createdDate" varchar NOT NULL DEFAULT (datetime('now')), "status" varchar NOT NULL, "startedAt" datetime, "finishedAt" datetime, "internalEventsId" varchar, CONSTRAINT "FK_6fd0401a16eab13575446a07fe7" FOREIGN KEY ("internalEventsId") REFERENCES "internal_event_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "algorithm_instance_dao"("id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId") SELECT "id", "algorithmDefinition", "participants", "createdDate", "status", "startedAt", "finishedAt", "internalEventsId" FROM "temporary_algorithm_instance_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_algorithm_instance_dao"`);
    }

}
