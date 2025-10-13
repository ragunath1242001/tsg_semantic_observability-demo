import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250929145008 implements MigrationInterface {
    name = 'Sqlite20250929145008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "scope_dao" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "alias" varchar NOT NULL, "discriminator" varchar NOT NULL, "description" varchar NOT NULL, "presentationDefinition" text NOT NULL, CONSTRAINT "UQ_ad901624ffdf1c13e1db173ec1b" UNIQUE ("alias"), CONSTRAINT "UQ_4ac27511c2b715caf0d395cfd36" UNIQUE ("discriminator"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "scope_dao"`);
    }

}
