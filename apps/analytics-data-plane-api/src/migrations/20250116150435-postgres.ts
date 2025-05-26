import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20250116150435 implements MigrationInterface {
  name = "Postgres20250116150435";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "metadata" ADD "csvw" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "metadata" DROP COLUMN "csvw"`);
  }
}
