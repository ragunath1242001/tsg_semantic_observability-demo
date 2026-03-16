import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260225084120 implements MigrationInterface {
    name = 'Postgres20260225084120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer_dao" DROP CONSTRAINT "FK_2cc4970e567c420b556cb2233e3"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" DROP CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ADD CONSTRAINT "FK_2cc4970e567c420b556cb2233e3" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" ADD CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" DROP CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58"`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" DROP CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203"`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" DROP CONSTRAINT "FK_2cc4970e567c420b556cb2233e3"`);
        await queryRunner.query(`ALTER TABLE "algorithm_event_dao" ADD CONSTRAINT "FK_0a76821e01c305c8cc15c6a0a58" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "internal_event_dao" ADD CONSTRAINT "FK_dd10057fa4d11c49cad9b3ff203" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfer_dao" ADD CONSTRAINT "FK_2cc4970e567c420b556cb2233e3" FOREIGN KEY ("algorithmInstanceId") REFERENCES "algorithm_instance_dao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
