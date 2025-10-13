import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250929145008 implements MigrationInterface {
    name = 'Postgres20250929145008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "scope_dao" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alias" character varying NOT NULL, "discriminator" character varying NOT NULL, "description" character varying NOT NULL, "presentationDefinition" text NOT NULL, CONSTRAINT "UQ_ad901624ffdf1c13e1db173ec1b" UNIQUE ("alias"), CONSTRAINT "UQ_4ac27511c2b715caf0d395cfd36" UNIQUE ("discriminator"), CONSTRAINT "PK_f4869176e0231a5055d8f2fdeba" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "scope_dao"`);
    }

}
