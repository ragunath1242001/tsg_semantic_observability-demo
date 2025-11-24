import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20251114130945 implements MigrationInterface {
    name = 'Postgres20251114130945'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_agreement_dao" ("id" SERIAL NOT NULL, "projectId" character varying NOT NULL, "projectAgreement" text NOT NULL, "initiator" character varying NOT NULL, "status" character varying NOT NULL, "signatures" text NOT NULL, "hash" character varying, CONSTRAINT "UQ_19af445b8804683ad9f6a431acd" UNIQUE ("projectId"), CONSTRAINT "PK_b15ea544513a08d9e406e672c79" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_agreement_callback_dao" ("id" SERIAL NOT NULL, "participantId" character varying NOT NULL, "url" character varying NOT NULL, "authToken" character varying NOT NULL, "transferId" character varying, "projectAgreementId" integer, CONSTRAINT "PK_b8500328facf65694069aba7058" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId" integer NOT NULL, "datasetDaoIdentifier" character varying NOT NULL, CONSTRAINT "PK_ebb68abf8ff87b3d9c92ce9e445" PRIMARY KEY ("projectAgreementDaoId", "datasetDaoIdentifier"))`);
        await queryRunner.query(`CREATE INDEX "IDX_367b764fe6c7ac512cd11cad4b" ON "project_agreement_dao_datasets_dataset_dao" ("projectAgreementDaoId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a7e36dd02b2df21bb2f8924b6" ON "project_agreement_dao_datasets_dataset_dao" ("datasetDaoIdentifier") `);
        await queryRunner.query(`ALTER TABLE "project_agreement_callback_dao" ADD CONSTRAINT "FK_e48050e64558c7a44fe5f086915" FOREIGN KEY ("projectAgreementId") REFERENCES "project_agreement_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_agreement_dao_datasets_dataset_dao" ADD CONSTRAINT "FK_367b764fe6c7ac512cd11cad4bb" FOREIGN KEY ("projectAgreementDaoId") REFERENCES "project_agreement_dao"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_agreement_dao_datasets_dataset_dao" ADD CONSTRAINT "FK_8a7e36dd02b2df21bb2f8924b6a" FOREIGN KEY ("datasetDaoIdentifier") REFERENCES "dataset_dao"("identifier") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_agreement_dao_datasets_dataset_dao" DROP CONSTRAINT "FK_8a7e36dd02b2df21bb2f8924b6a"`);
        await queryRunner.query(`ALTER TABLE "project_agreement_dao_datasets_dataset_dao" DROP CONSTRAINT "FK_367b764fe6c7ac512cd11cad4bb"`);
        await queryRunner.query(`ALTER TABLE "project_agreement_callback_dao" DROP CONSTRAINT "FK_e48050e64558c7a44fe5f086915"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a7e36dd02b2df21bb2f8924b6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_367b764fe6c7ac512cd11cad4b"`);
        await queryRunner.query(`DROP TABLE "project_agreement_dao_datasets_dataset_dao"`);
        await queryRunner.query(`DROP TABLE "project_agreement_callback_dao"`);
        await queryRunner.query(`DROP TABLE "project_agreement_dao"`);
    }

}
