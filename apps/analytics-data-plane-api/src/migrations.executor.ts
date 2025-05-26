import "reflect-metadata";

import chalk from "chalk";
import path from "path";
import { PostgresMock } from "pgmock";
import { DataSource } from "typeorm";
import { CommandUtils } from "typeorm/commands/CommandUtils.js";
import { MigrationGenerateCommand } from "typeorm/commands/MigrationGenerateCommand.js";

const datasourceDefaults = {
  entities: ["**/*.dao.ts"],
  synchronize: false,
  migrationsRun: false,
  dropSchema: false,
  logging: false
};

async function generate(
  type: "sqlite" | "postgres",
  timestamp: string,
  check: boolean = false
) {
  let mock: PostgresMock | undefined = undefined;
  const fullPath = path.resolve(process.cwd(), `src/migrations/${type}`);
  const filename = `${timestamp}-${path.basename(fullPath)}.ts`;
  let dataSource: DataSource;
  if (type === "postgres") {
    mock = await PostgresMock.create();
    await mock.listen(32609);

    dataSource = new DataSource({
      type: "postgres",
      port: 32609,
      username: "postgres",
      password: "pgmock",
      migrations: ["src/migrations/*-postgres.ts"],
      ...datasourceDefaults
    });
  } else {
    dataSource = new DataSource({
      type: "sqlite",
      database: ":memory:",
      migrations: ["src/migrations/*-sqlite.ts"],
      ...datasourceDefaults
    });
  }
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();

    const upSqls: string[] = [],
      downSqls: string[] = [];

    try {
      const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

      sqlInMemory.upQueries.forEach((upQuery) => {
        upSqls.push(
          "        await queryRunner.query(`" +
            upQuery.query.replace(new RegExp("`", "g"), "\\`") +
            "`" +
            MigrationGenerateCommand["queryParams"](upQuery.parameters) +
            ");"
        );
      });
      sqlInMemory.downQueries.forEach((downQuery) => {
        downSqls.push(
          "        await queryRunner.query(`" +
            downQuery.query.replace(new RegExp("`", "g"), "\\`") +
            "`" +
            MigrationGenerateCommand["queryParams"](downQuery.parameters) +
            ");"
        );
      });
    } finally {
      await dataSource.destroy();
      mock?.destroy();
    }

    if (!upSqls.length) {
      console.log(
        chalk.yellow(type.padEnd(9) + "- ") +
          chalk.green(`No changes in database schema were found`)
      );
      return;
    }
    if (check) {
      console.log(
        chalk.yellow(type.padEnd(9) + "- ") + chalk.red(`Migrations necessary`)
      );
      return process.exit(1);
    }

    const fileContent = MigrationGenerateCommand["getTemplate"](
      path.basename(fullPath),
      timestamp as unknown as number,
      upSqls,
      downSqls.reverse()
    );

    const migrationFileName = path.dirname(fullPath) + "/" + filename;
    await CommandUtils.createFile(migrationFileName, fileContent);

    console.log(
      chalk.yellow(type.padEnd(9) + "- ") +
        chalk.green(
          `Migration ${chalk.blue(
            migrationFileName
          )} has been generated successfully.`
        )
    );
  } catch (err) {
    console.log(
      chalk.yellow(type.padEnd(9) + "- ") +
        chalk.red(`Error during migration generation:`)
    );
    console.error(err);
    process.exit(1);
  }
}

async function run() {
  const timestamp = new Date().toISOString().slice(0, -5).replace(/[-:T]/g, "");

  if (process.argv.includes("--check")) {
    console.log(chalk.blue("Checking for necessary migrations in database"));
    process.env.DB_MIGRATION_TYPE = "sqlite";
    await generate("sqlite", timestamp, true);
  } else {
    if (process.argv.includes("--sqlite")) {
      console.log(chalk.blue("Generating SQLite migrations"));
      process.env.DB_MIGRATION_TYPE = "sqlite";

      await generate("sqlite", timestamp);
    } else if (process.argv.includes("--postgres")) {
      console.log(chalk.blue("Generating Postgres migrations"));
      process.env.DB_MIGRATION_TYPE = "postgres";

      await generate("postgres", timestamp);
    } else {
      console.log(
        chalk.red(
          "Please specify --sqlite or --postgres to generate migrations"
        )
      );
      process.exit(1);
    }
  }
  process.exit(0);
}

run();
