import { MigrationInterface, QueryRunner } from "typeorm";

export class Sqlite20260601120000 implements MigrationInterface {
  name = "Sqlite20260601120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "semantic_observability_event" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "timestamp" datetime NOT NULL DEFAULT (datetime('now')), "component" varchar NOT NULL, "eventType" varchar NOT NULL, "dimensions" text NOT NULL, "status" varchar NOT NULL, "context" text, "artefacts" text, "failureCategory" varchar, "durationMs" integer, "metadataCompletenessScore" float, "validationErrorCount" integer, "attributes" text)`
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
      `CREATE TABLE "semantic_observability_metric_snapshot" ("createdDate" datetime NOT NULL DEFAULT (datetime('now')), "modifiedDate" datetime NOT NULL DEFAULT (datetime('now')), "deletedDate" datetime, "id" varchar PRIMARY KEY NOT NULL, "generatedAt" varchar NOT NULL, "bucket" varchar NOT NULL, "timeWindowStart" varchar NOT NULL, "timeWindowEnd" varchar NOT NULL, "metricName" varchar NOT NULL, "metricValue" float NOT NULL, "eventCount" integer NOT NULL, "count" integer, "successCount" integer, "failureCount" integer, "failureCategory" varchar, "averageLatencyMs" float, "participantPseudonym" varchar, "remoteParticipantPseudonym" varchar, "participantPairPseudonym" varchar, "datasetPseudonym" varchar, "datasetCategory" varchar, "artefactType" varchar, "artefactReference" varchar, "artefactVersion" varchar)`
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
    await queryRunner.query(`DROP INDEX "IDX_adf75d1863de48042b7b5522cb"`);
    await queryRunner.query(`DROP INDEX "IDX_a0bf34c936283d2d68dde6d2df"`);
    await queryRunner.query(`DROP INDEX "IDX_dca1bd465420cb76b12de3e529"`);
    await queryRunner.query(`DROP INDEX "IDX_817333120144ac3174b5ab2776"`);
    await queryRunner.query(`DROP TABLE "semantic_observability_metric_snapshot"`);
    await queryRunner.query(`DROP INDEX "IDX_a47bedf779934128962b8d467c"`);
    await queryRunner.query(`DROP INDEX "IDX_35f674c62907651636b5aab0c5"`);
    await queryRunner.query(`DROP INDEX "IDX_013a4f4a740e9e5d42fc8d510d"`);
    await queryRunner.query(`DROP INDEX "IDX_16f4301ad027f7e0074f00e7ae"`);
    await queryRunner.query(`DROP TABLE "semantic_observability_event"`);
  }
}
