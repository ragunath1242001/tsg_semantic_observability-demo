import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20251114130934 implements MigrationInterface {
    name = 'Sqlite20251114130934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_agreement_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "projectId" varchar NOT NULL, "projectAgreement" text NOT NULL, "initiator" varchar NOT NULL, "status" varchar NOT NULL, "signatures" text NOT NULL, "hash" varchar, CONSTRAINT "UQ_19af445b8804683ad9f6a431acd" UNIQUE ("projectId"))`);
        await queryRunner.query(`CREATE TABLE "project_agreement_callback_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "participantId" varchar NOT NULL, "url" varchar NOT NULL, "authToken" varchar NOT NULL, "transferId" varchar, "projectAgreementId" integer)`);
        await queryRunner.query(`CREATE TABLE "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId" integer NOT NULL, "datasetDaoIdentifier" varchar NOT NULL, PRIMARY KEY ("projectAgreementDaoId", "datasetDaoIdentifier"))`);
        await queryRunner.query(`CREATE INDEX "IDX_367b764fe6c7ac512cd11cad4b" ON "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a7e36dd02b2df21bb2f8924b6" ON "project_agreement_dao_datasets_dataset_dao" ("datasetDaoIdentifier") `);
        await queryRunner.query(`CREATE TABLE "temporary_project_agreement_callback_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "participantId" varchar NOT NULL, "url" varchar NOT NULL, "authToken" varchar NOT NULL, "transferId" varchar, "projectAgreementId" integer, CONSTRAINT "FK_e48050e64558c7a44fe5f086915" FOREIGN KEY ("projectAgreementId") REFERENCES "project_agreement_dao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_project_agreement_callback_dao"("id", "participantId", "url", "authToken", "transferId", "projectAgreementId") SELECT "id", "participantId", "url", "authToken", "transferId", "projectAgreementId" FROM "project_agreement_callback_dao"`);
        await queryRunner.query(`DROP TABLE "project_agreement_callback_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_project_agreement_callback_dao" RENAME TO "project_agreement_callback_dao"`);
        await queryRunner.query(`DROP INDEX "IDX_367b764fe6c7ac512cd11cad4b"`);
        await queryRunner.query(`DROP INDEX "IDX_8a7e36dd02b2df21bb2f8924b6"`);
        await queryRunner.query(`CREATE TABLE "temporary_project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId" integer NOT NULL, "datasetDaoIdentifier" varchar NOT NULL, CONSTRAINT "FK_367b764fe6c7ac512cd11cad4bb" FOREIGN KEY ("projectAgreementDaoId") REFERENCES "project_agreement_dao" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_8a7e36dd02b2df21bb2f8924b6a" FOREIGN KEY ("datasetDaoIdentifier") REFERENCES "dataset_dao" ("identifier") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("projectAgreementDaoId", "datasetDaoIdentifier"))`);
        await queryRunner.query(`INSERT INTO "temporary_project_agreement_dao_datasets_dataset_dao"("projectAgreementDaoId", "datasetDaoIdentifier") SELECT "projectAgreementDaoId", "datasetDaoIdentifier" FROM "project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_project_agreement_dao_datasets_dataset_dao" RENAME TO "project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`CREATE INDEX "IDX_367b764fe6c7ac512cd11cad4b" ON "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a7e36dd02b2df21bb2f8924b6" ON "project_agreement_dao_datasets_dataset_dao" ("datasetDaoIdentifier") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_8a7e36dd02b2df21bb2f8924b6"`);
        await queryRunner.query(`DROP INDEX "IDX_367b764fe6c7ac512cd11cad4b"`);
        await queryRunner.query(`ALTER TABLE "project_agreement_dao_datasets_dataset_dao" RENAME TO "temporary_project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`CREATE TABLE "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId" integer NOT NULL, "datasetDaoIdentifier" varchar NOT NULL, PRIMARY KEY ("projectAgreementDaoId", "datasetDaoIdentifier"))`);
        await queryRunner.query(`INSERT INTO "project_agreement_dao_datasets_dataset_dao"("projectAgreementDaoId", "datasetDaoIdentifier") SELECT "projectAgreementDaoId", "datasetDaoIdentifier" FROM "temporary_project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`CREATE INDEX "IDX_8a7e36dd02b2df21bb2f8924b6" ON "project_agreement_dao_datasets_dataset_dao" ("datasetDaoIdentifier") `);
        await queryRunner.query(`CREATE INDEX "IDX_367b764fe6c7ac512cd11cad4b" ON "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId") `);
        await queryRunner.query(`ALTER TABLE "project_agreement_callback_dao" RENAME TO "temporary_project_agreement_callback_dao"`);
        await queryRunner.query(`CREATE TABLE "project_agreement_callback_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "participantId" varchar NOT NULL, "url" varchar NOT NULL, "authToken" varchar NOT NULL, "transferId" varchar, "projectAgreementId" integer)`);
        await queryRunner.query(`INSERT INTO "project_agreement_callback_dao"("id", "participantId", "url", "authToken", "transferId", "projectAgreementId") SELECT "id", "participantId", "url", "authToken", "transferId", "projectAgreementId" FROM "temporary_project_agreement_callback_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_project_agreement_callback_dao"`);
        await queryRunner.query(`DROP INDEX "IDX_8a7e36dd02b2df21bb2f8924b6"`);
        await queryRunner.query(`DROP INDEX "IDX_367b764fe6c7ac512cd11cad4b"`);
        await queryRunner.query(`DROP TABLE "project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "project_agreement_callback_dao"`);
        await queryRunner.query(`DROP TABLE "project_agreement_dao"`);
    }

}
