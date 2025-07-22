import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250715145608 implements MigrationInterface {
    name = 'Sqlite20250715145608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "dcqlQuery" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_authorization_request_dao"("identifier", "dcqlQuery", "nonce", "createdDate", "modifiedDate", "deletedDate") SELECT "identifier", "presentationDefinition", "nonce", "createdDate", "modifiedDate", "deletedDate" FROM "authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_authorization_request_dao" RENAME TO "authorization_request_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME TO "temporary_authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime)`);
        await queryRunner.query(`INSERT INTO "authorization_request_dao"("identifier", "presentationDefinition", "nonce", "createdDate", "modifiedDate", "deletedDate") SELECT "identifier", "dcqlQuery", "nonce", "createdDate", "modifiedDate", "deletedDate" FROM "temporary_authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_authorization_request_dao"`);
    }

}
