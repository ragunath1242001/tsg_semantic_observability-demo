import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20250129161501 implements MigrationInterface {
    name = 'Sqlite20250129161501'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "authorization_request_dao" ("created" datetime NOT NULL DEFAULT (datetime('now')), "modified" datetime NOT NULL DEFAULT (datetime('now')), "deleted" datetime, "identifier" varchar PRIMARY KEY NOT NULL, "presentationDefinition" text NOT NULL, "nonce" varchar NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "authorization_request_dao"`);
    }

}
