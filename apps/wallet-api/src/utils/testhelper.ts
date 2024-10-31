import { TypeOrmModule } from "@nestjs/typeorm";
import sqlite3 from "sqlite3";

export class TypeOrmTestHelper {
  private static _instance: TypeOrmTestHelper;

  private constructor() {}

  public static get instance(): TypeOrmTestHelper {
    if (!this._instance) this._instance = new TypeOrmTestHelper();

    return this._instance;
  }

  private testdb!: sqlite3.Database;

  async setupTestDB() {
    this.testdb = new sqlite3.Database(":memory:");
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  module(entities: any[]) {
    return TypeOrmModule.forRoot({
      type: "sqlite",
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
