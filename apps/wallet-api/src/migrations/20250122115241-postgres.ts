import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250122115241 implements MigrationInterface {
    name = 'Postgres20250122115241'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "status_list_credential_dao" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" character varying NOT NULL, "revoked" text NOT NULL, "full" boolean NOT NULL, "credentialId" character varying, CONSTRAINT "REL_20ce7613497c20b7cceabe6815" UNIQUE ("credentialId"), CONSTRAINT "PK_788c05809eac7598ae8f1dbddd3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "revoked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "statusListIndex" integer`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD "statusListCredentialId" character varying`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD CONSTRAINT "FK_9bf957e3dd684407894be5c912b" FOREIGN KEY ("statusListCredentialId") REFERENCES "status_list_credential_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "status_list_credential_dao" ADD CONSTRAINT "FK_20ce7613497c20b7cceabe68154" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "status_list_credential_dao" DROP CONSTRAINT "FK_20ce7613497c20b7cceabe68154"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP CONSTRAINT "FK_9bf957e3dd684407894be5c912b"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "statusListCredentialId"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "statusListIndex"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP COLUMN "revoked"`);
        await queryRunner.query(`DROP TABLE "status_list_credential_dao"`);
    }

}
