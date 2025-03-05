import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250305170013 implements MigrationInterface {
    name = 'Sqlite20250305170013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_authorization_request_dao"("identifier", "presentationDefinition", "nonce") SELECT "identifier", "presentationDefinition", "nonce" FROM "authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_authorization_request_dao" RENAME TO "authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "authorizationRequest" text, "completed" boolean NOT NULL DEFAULT (0), "userId" integer)`);
        await queryRunner.query(`INSERT INTO "temporary_authorization_request_dao"("identifier", "presentationDefinition", "nonce") SELECT "identifier", "presentationDefinition", "nonce" FROM "authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_authorization_request_dao" RENAME TO "authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "temporary_authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "authorizationRequest" text, "completed" boolean NOT NULL DEFAULT (0), "userId" integer, CONSTRAINT "FK_f1462bf9279add899e91ff7489a" FOREIGN KEY ("userId") REFERENCES "oauth_user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_authorization_request_dao"("identifier", "presentationDefinition", "nonce", "createdDate", "modifiedDate", "deletedDate", "authorizationRequest", "completed", "userId") SELECT "identifier", "presentationDefinition", "nonce", "createdDate", "modifiedDate", "deletedDate", "authorizationRequest", "completed", "userId" FROM "authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_authorization_request_dao" RENAME TO "authorization_request_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME TO "temporary_authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "authorizationRequest" text, "completed" boolean NOT NULL DEFAULT (0), "userId" integer)`);
        await queryRunner.query(`INSERT INTO "authorization_request_dao"("identifier", "presentationDefinition", "nonce", "createdDate", "modifiedDate", "deletedDate", "authorizationRequest", "completed", "userId") SELECT "identifier", "presentationDefinition", "nonce", "createdDate", "modifiedDate", "deletedDate", "authorizationRequest", "completed", "userId" FROM "temporary_authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME TO "temporary_authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "authorization_request_dao"("identifier", "presentationDefinition", "nonce") SELECT "identifier", "presentationDefinition", "nonce" FROM "temporary_authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_authorization_request_dao"`);
        await queryRunner.query(`ALTER TABLE "authorization_request_dao" RENAME TO "temporary_authorization_request_dao"`);
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "authorization_request_dao"("identifier", "presentationDefinition", "nonce") SELECT "identifier", "presentationDefinition", "nonce" FROM "temporary_authorization_request_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_authorization_request_dao"`);
    }

}
