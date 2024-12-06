import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20241206075739 implements MigrationInterface {
    name = 'Sqlite20241206075739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_constraint_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "type" varchar CHECK( "type" IN ('ATOMIC','LOGICAL') ) NOT NULL, "title" varchar NOT NULL, "description" varchar, "logicalOperator" varchar, "leftOperand" varchar, "operator" varchar, "contextPath" varchar, "evaluable" text, "dataType" varchar CHECK( "dataType" IN ('STRING','URI','NUMBER','DATE','DATETIME','DIF_INPUT_DESCRIPTOR') ), "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, CONSTRAINT "UQ_d487a181b8f56c170a86fe53c87" UNIQUE ("leftOperand"))`);
        await queryRunner.query(`INSERT INTO "temporary_constraint_dao"("id", "type", "title", "description", "logicalOperator", "leftOperand", "operator", "contextPath", "evaluable", "dataType") SELECT "id", "type", "title", "description", "logicalOperator", "leftOperand", "operator", "contextPath", "evaluable", "dataType" FROM "constraint_dao"`);
        await queryRunner.query(`DROP TABLE "constraint_dao"`);
        await queryRunner.query(`ALTER TABLE "temporary_constraint_dao" RENAME TO "constraint_dao"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "constraint_dao" RENAME TO "temporary_constraint_dao"`);
        await queryRunner.query(`CREATE TABLE "constraint_dao" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "type" varchar CHECK( "type" IN ('ATOMIC','LOGICAL') ) NOT NULL, "title" varchar NOT NULL, "description" varchar, "logicalOperator" varchar, "leftOperand" varchar, "operator" varchar, "contextPath" varchar, "evaluable" text, "dataType" varchar CHECK( "dataType" IN ('STRING','URI','NUMBER','DATE','DATETIME','DIF_INPUT_DESCRIPTOR') ), CONSTRAINT "UQ_d487a181b8f56c170a86fe53c87" UNIQUE ("leftOperand"))`);
        await queryRunner.query(`INSERT INTO "constraint_dao"("id", "type", "title", "description", "logicalOperator", "leftOperand", "operator", "contextPath", "evaluable", "dataType") SELECT "id", "type", "title", "description", "logicalOperator", "leftOperand", "operator", "contextPath", "evaluable", "dataType" FROM "temporary_constraint_dao"`);
        await queryRunner.query(`DROP TABLE "temporary_constraint_dao"`);
    }

}
