import { MigrationInterface, QueryRunner } from "typeorm";

export class Postgres20260601120000 implements MigrationInterface {
  name = "Postgres20260601120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "semantic_observability_event" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "component" character varying NOT NULL, "eventType" character varying NOT NULL, "dimensions" text NOT NULL, "status" character varying NOT NULL, "context" text, "artefacts" text, "failureCategory" character varying, "durationMs" integer, "metadataCompletenessScore" double precision, "validationErrorCount" integer, "attributes" text, CONSTRAINT "PK_semantic_observability_event" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_16f4301ad027f7e0074f00e7ae" ON "semantic_observability_event" ("timestamp") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_013a4f4a740e9e5d42fc8d510d" ON "semantic_observability_event" ("component") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35f674c62907651636b5aab0c5" ON "semantic_observability_event" ("eventType") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a47bedf779934128962b8d467c" ON "semantic_observability_event" ("status") `
    );
    await queryRunner.query(
      `CREATE TABLE "semantic_observability_metric_snapshot" ("createdDate" TIMESTAMP NOT NULL DEFAULT now(), "modifiedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "id" character varying NOT NULL, "generatedAt" character varying NOT NULL, "bucket" character varying NOT NULL, "timeWindowStart" character varying NOT NULL, "timeWindowEnd" character varying NOT NULL, "metricName" character varying NOT NULL, "metricValue" double precision NOT NULL, "eventCount" integer NOT NULL, "count" integer, "successCount" integer, "failureCount" integer, "failureCategory" character varying, "averageLatencyMs" double precision, "participantPseudonym" character varying, "remoteParticipantPseudonym" character varying, "participantPairPseudonym" character varying, "datasetPseudonym" character varying, "datasetCategory" character varying, "artefactType" character varying, "artefactReference" character varying, "artefactVersion" character varying, CONSTRAINT "PK_semantic_observability_metric_snapshot" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_817333120144ac3174b5ab2776" ON "semantic_observability_metric_snapshot" ("bucket", "timeWindowStart") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dca1bd465420cb76b12de3e529" ON "semantic_observability_metric_snapshot" ("metricName") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0bf34c936283d2d68dde6d2df" ON "semantic_observability_metric_snapshot" ("datasetPseudonym") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_adf75d1863de48042b7b5522cb" ON "semantic_observability_metric_snapshot" ("participantPairPseudonym") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_adf75d1863de48042b7b5522cb"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a0bf34c936283d2d68dde6d2df"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dca1bd465420cb76b12de3e529"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_817333120144ac3174b5ab2776"`
    );
    await queryRunner.query(`DROP TABLE "semantic_observability_metric_snapshot"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a47bedf779934128962b8d467c"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35f674c62907651636b5aab0c5"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_013a4f4a740e9e5d42fc8d510d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_16f4301ad027f7e0074f00e7ae"`
    );
    await queryRunner.query(`DROP TABLE "semantic_observability_event"`);
  }
}
