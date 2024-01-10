import { TypeOrmModule } from '@nestjs/typeorm';
import { Database } from 'sqlite3';
import fs from 'fs';

export class TypeOrmTestHelper {

    private static _instance: TypeOrmTestHelper;
    database: string = ':memory:';

    private constructor() {
    }

    public static get instance(): TypeOrmTestHelper {
        if(!this._instance) this._instance = new TypeOrmTestHelper();

        return this._instance;
    }

    testdb!: Database;


    async setupTestDB(database: string = ':memory:') {
      this.database = database;
      this.testdb = new Database(this.database);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    module(entities: any[]) {
      return TypeOrmModule.forRoot({
        type: 'sqlite',
        database: this.database,
        name: 'default',
        entities: entities,
        synchronize: true
      })
    }

    async teardownTestDB() {
      await new Promise<void>(resolve => {
        this.testdb.close(() => {
          resolve()
        });
      })
      if (this.database != ':memory:') {
        fs.rmSync(this.database);
      }
    }

}
