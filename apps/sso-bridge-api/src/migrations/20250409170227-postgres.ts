import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250409170227 implements MigrationInterface {
    name = 'Postgres20250409170227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oauth_role" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "PK_89bac2d429a1266c845ba6d588c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "oauth_user_roles_oauth_role" ("oauthUserId" integer NOT NULL, "oauthRoleId" integer NOT NULL, CONSTRAINT "PK_174ef92ff7b760b2a1fb2ea3aaf" PRIMARY KEY ("oauthUserId", "oauthRoleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_40441534cbeab8be66d6db15ca" ON "oauth_user_roles_oauth_role" ("oauthUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e2393a3d0615f583e34af0a0ef" ON "oauth_user_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`CREATE TABLE "oauth_client_roles_oauth_role" ("oauthClientId" integer NOT NULL, "oauthRoleId" integer NOT NULL, CONSTRAINT "PK_e2476644ef77d8e376a8e9655cc" PRIMARY KEY ("oauthClientId", "oauthRoleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8a1a20e5594d518de7091dda7a" ON "oauth_client_roles_oauth_role" ("oauthClientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_80687e7520f8f3a34461458c21" ON "oauth_client_roles_oauth_role" ("oauthRoleId") `);
        await queryRunner.query(`ALTER TABLE "oauth_user" DROP COLUMN "roles"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" DROP COLUMN "roles"`);
        await queryRunner.query(`ALTER TABLE "oauth_user_roles_oauth_role" ADD CONSTRAINT "FK_40441534cbeab8be66d6db15ca8" FOREIGN KEY ("oauthUserId") REFERENCES "oauth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "oauth_user_roles_oauth_role" ADD CONSTRAINT "FK_e2393a3d0615f583e34af0a0ef2" FOREIGN KEY ("oauthRoleId") REFERENCES "oauth_role"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "oauth_client_roles_oauth_role" ADD CONSTRAINT "FK_8a1a20e5594d518de7091dda7af" FOREIGN KEY ("oauthClientId") REFERENCES "oauth_client"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "oauth_client_roles_oauth_role" ADD CONSTRAINT "FK_80687e7520f8f3a34461458c212" FOREIGN KEY ("oauthRoleId") REFERENCES "oauth_role"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_client_roles_oauth_role" DROP CONSTRAINT "FK_80687e7520f8f3a34461458c212"`);
        await queryRunner.query(`ALTER TABLE "oauth_client_roles_oauth_role" DROP CONSTRAINT "FK_8a1a20e5594d518de7091dda7af"`);
        await queryRunner.query(`ALTER TABLE "oauth_user_roles_oauth_role" DROP CONSTRAINT "FK_e2393a3d0615f583e34af0a0ef2"`);
        await queryRunner.query(`ALTER TABLE "oauth_user_roles_oauth_role" DROP CONSTRAINT "FK_40441534cbeab8be66d6db15ca8"`);
        await queryRunner.query(`ALTER TABLE "oauth_client" ADD "roles" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "oauth_user" ADD "roles" text NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_80687e7520f8f3a34461458c21"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a1a20e5594d518de7091dda7a"`);
        await queryRunner.query(`DROP TABLE "oauth_client_roles_oauth_role"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2393a3d0615f583e34af0a0ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40441534cbeab8be66d6db15ca"`);
        await queryRunner.query(`DROP TABLE "oauth_user_roles_oauth_role"`);
        await queryRunner.query(`DROP TABLE "oauth_role"`);
    }

}
