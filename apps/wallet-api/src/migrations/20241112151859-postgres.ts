import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20241112151859 implements MigrationInterface {
    name = 'Postgres20241112151859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "key_materials" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" character varying NOT NULL, "type" character varying NOT NULL, "default" boolean NOT NULL, "privateKey" text NOT NULL, "publicKey" text NOT NULL, "caChain" character varying, CONSTRAINT "PK_0727dec8a0fc93d1d7dfdcd64a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "credentials" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" character varying NOT NULL, "targetDid" character varying NOT NULL, "credential" text NOT NULL, "selfIssued" boolean NOT NULL, CONSTRAINT "PK_1e38bc43be6697cdda548ad27a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "did_documents" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "document" text NOT NULL, CONSTRAINT "PK_a604aab1c9cc976196e81f49a1c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "did_service" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" character varying NOT NULL, "type" character varying NOT NULL, "serviceEndpoint" character varying NOT NULL, CONSTRAINT "PK_bab1261ee04f3327c27e21a71ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "did_logs" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "scid" character varying NOT NULL, "logEntry" text NOT NULL, CONSTRAINT "PK_f50fba4676de7256d08e0a899cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "jsonld_context" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" character varying NOT NULL, "credentialType" character varying NOT NULL, "issuable" boolean NOT NULL, "documentUrl" character varying, "document" text, "schema" text, CONSTRAINT "PK_aafd30bd9f911e7f72ba942da37" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "si_token" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "accessToken" character varying, "audience" character varying NOT NULL, "scope" character varying, CONSTRAINT "PK_ed80790a68a3f4980e94a63e3aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "credential_issuance" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "id" SERIAL NOT NULL, "preAuthorizedCode" character varying NOT NULL, "holderId" character varying NOT NULL, "credentialType" character varying NOT NULL, "credentialId" character varying, "revoked" boolean NOT NULL, "credentialSubject" text NOT NULL, CONSTRAINT "UQ_bbf0dd236b76f0665f5352c6a29" UNIQUE ("preAuthorizedCode"), CONSTRAINT "PK_b57f19401956afc6440e77bbebd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ci_access_token" ("created" TIMESTAMP NOT NULL DEFAULT now(), "modified" TIMESTAMP NOT NULL DEFAULT now(), "deleted" TIMESTAMP, "access_token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "refresh_token" character varying NOT NULL, "nonce" character varying NOT NULL, "issuanceId" integer, CONSTRAINT "PK_df976b25aab0eabb4e824bd9654" PRIMARY KEY ("access_token"))`);
        await queryRunner.query(`ALTER TABLE "ci_access_token" ADD CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848" FOREIGN KEY ("issuanceId") REFERENCES "credential_issuance"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ci_access_token" DROP CONSTRAINT "FK_961e5cfd0bd678f6c91ce658848"`);
        await queryRunner.query(`DROP TABLE "ci_access_token"`);
        await queryRunner.query(`DROP TABLE "credential_issuance"`);
        await queryRunner.query(`DROP TABLE "si_token"`);
        await queryRunner.query(`DROP TABLE "jsonld_context"`);
        await queryRunner.query(`DROP TABLE "did_logs"`);
        await queryRunner.query(`DROP TABLE "did_service"`);
        await queryRunner.query(`DROP TABLE "did_documents"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
        await queryRunner.query(`DROP TABLE "key_materials"`);
    }

}
