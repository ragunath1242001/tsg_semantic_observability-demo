import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260202165047 implements MigrationInterface {
    name = 'Postgres20260202165047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME COLUMN "identifier" TO "id"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME CONSTRAINT "PK_99fc14b0dcc6dd517cb33446f60" TO "PK_de07b115c55ebe75c9d644629d2"`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "ownerId" character varying`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "ownerIdentifier" character varying`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "createdBy" character varying`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "tenantId" character varying`);
        await queryRunner.query(`TRUNCATE ci_access_token`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "PK_df976b25aab0eabb4e824bd9654"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "PK_c8b46127ca9fdb21e1b80dbf7c1" PRIMARY KEY ("access_token", "id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP CONSTRAINT "PK_b57f19401956afc6440e77bbebd"`);
        // await queryRunner.query(`ALTER TABLE "credential_issuance" DROP COLUMN "id"`);
        // await queryRunner.query(`ALTER TABLE "credential_issuance" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ALTER COLUMN "id" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD CONSTRAINT "PK_b57f19401956afc6440e77bbebd" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP COLUMN "issuanceId"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD "issuanceId" character varying`);
        await queryRunner.query(`ALTER TABLE "scope_dao" DROP CONSTRAINT "PK_f4869176e0231a5055d8f2fdeba"`);
        // await queryRunner.query(`ALTER TABLE "scope_dao" DROP COLUMN "id"`);
        // await queryRunner.query(`ALTER TABLE "scope_dao" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "scope_dao" ALTER COLUMN "id" TYPE character varying`);
        await queryRunner.query(`ALTER TABLE "scope_dao" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "scope_dao" ADD CONSTRAINT "PK_f4869176e0231a5055d8f2fdeba" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848"`);
        await queryRunner.query(`ALTER TABLE "scope_dao" DROP CONSTRAINT "PK_f4869176e0231a5055d8f2fdeba"`);
        await queryRunner.query(`ALTER TABLE "scope_dao" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "scope_dao" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "scope_dao" ADD CONSTRAINT "PK_f4869176e0231a5055d8f2fdeba" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP COLUMN "issuanceId"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD "issuanceId" uuid`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP CONSTRAINT "PK_b57f19401956afc6440e77bbebd"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD CONSTRAINT "PK_b57f19401956afc6440e77bbebd" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "PK_c8b46127ca9fdb21e1b80dbf7c1"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "PK_df976b25aab0eabb4e824bd9654" PRIMARY KEY ("access_token")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "createdBy"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "ownerIdentifier"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "ownerId"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME CONSTRAINT "PK_de07b115c55ebe75c9d644629d2" TO "PK_99fc14b0dcc6dd517cb33446f60"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME COLUMN "id" TO "identifier"`);
    }

}
