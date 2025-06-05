import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250605131310 implements MigrationInterface {
    name = 'Postgres20250605131310'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP CONSTRAINT "PK_b57f19401956afc6440e77bbebd"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD CONSTRAINT "PK_b57f19401956afc6440e77bbebd" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP COLUMN "issuanceId"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD "issuanceId" uuid`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP COLUMN "issuanceId"`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD "issuanceId" integer`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP CONSTRAINT "PK_b57f19401956afc6440e77bbebd"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "credential_issuance" ADD CONSTRAINT "PK_b57f19401956afc6440e77bbebd" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
