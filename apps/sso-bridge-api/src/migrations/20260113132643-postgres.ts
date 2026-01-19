import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260113132643 implements MigrationInterface {
    name = 'Postgres20260113132643'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "web_authn_credential" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" SERIAL NOT NULL, "userId" integer NOT NULL, "credentialId" character varying NOT NULL, "publicKey" character varying NOT NULL, "counter" integer NOT NULL DEFAULT '0', "deviceName" character varying, "transports" character varying, "lastUsed" TIMESTAMP NOT NULL, CONSTRAINT "UQ_b0d9884eca4df9e50b3d7bad189" UNIQUE ("credentialId"), CONSTRAINT "PK_75836493a407b2d7a4cb926ad97" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "totp_credential" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" SERIAL NOT NULL, "userId" integer NOT NULL, "secret" character varying NOT NULL, "deviceName" character varying, "isVerified" boolean NOT NULL DEFAULT false, "lastUsed" TIMESTAMP, CONSTRAINT "PK_6ecb771ad9517a5b9ba9c8473e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "recovery_code" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" SERIAL NOT NULL, "userId" integer NOT NULL, "codeHash" character varying NOT NULL, "used" boolean NOT NULL DEFAULT false, "usedAt" TIMESTAMP, CONSTRAINT "PK_b7f1e23329e93a80e25fd281922" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "require2FA" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "web_authn_credential" ADD CONSTRAINT "FK_609fa7bda999525a4fa55cd9354" FOREIGN KEY ("userId") REFERENCES "oauth_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "totp_credential" ADD CONSTRAINT "FK_9180faedc035e0ba4514062a302" FOREIGN KEY ("userId") REFERENCES "oauth_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recovery_code" ADD CONSTRAINT "FK_0e10289994b9a90be4cde06e15c" FOREIGN KEY ("userId") REFERENCES "oauth_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recovery_code" DROP CONSTRAINT "FK_0e10289994b9a90be4cde06e15c"`);
        await queryRunner.query(`ALTER TABLE "totp_credential" DROP CONSTRAINT "FK_9180faedc035e0ba4514062a302"`);
        await queryRunner.query(`ALTER TABLE "web_authn_credential" DROP CONSTRAINT "FK_609fa7bda999525a4fa55cd9354"`);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "require2FA"`);
        await queryRunner.query(`DROP TABLE "recovery_code"`);
        await queryRunner.query(`DROP TABLE "totp_credential"`);
        await queryRunner.query(`DROP TABLE "web_authn_credential"`);
    }

}
