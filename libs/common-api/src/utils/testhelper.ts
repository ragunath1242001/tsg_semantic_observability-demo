import { TypeOrmModule } from "@nestjs/typeorm";
import Database from "better-sqlite3";

export class TypeOrmTestHelper {
  private static _instance: TypeOrmTestHelper;

  private constructor() {}

  public static get instance(): TypeOrmTestHelper {
    if (!this._instance) this._instance = new TypeOrmTestHelper();

    return this._instance;
  }

  private testdb!: InstanceType<typeof Database>;

  async setupTestDB() {
    this.testdb = new Database(":memory:");
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  module(entities: any[]) {
    return TypeOrmModule.forRoot({
      type: "better-sqlite3",
      database: ":memory:",
      name: "default",
      entities: entities,
      synchronize: true
    });
  }

  teardownTestDB() {
    this.testdb.close();
  }
}
