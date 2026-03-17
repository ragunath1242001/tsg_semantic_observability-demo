import { plainToInstance, Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested
} from "class-validator";

import { valueToBoolean } from "../utils/config.js";
import { Description } from "../utils/configToMarkdown.js";

export class SSLConfig {
  @Description("Reject unauthorized SSL certificates")
  @Transform(valueToBoolean)
  @IsBoolean()
  public readonly rejectUnauthorized: boolean = false;
}

export abstract class DatabaseConfig {
  @Description("Type of database")
  @IsString()
  @IsIn(["sqlite", "postgres"])
  public readonly type!: "sqlite" | "postgres";

  @Description("Name of the database")
  @IsString()
  public readonly database!: string;

  @Description("Synchronize database schema")
  @IsBoolean()
  @IsOptional()
  public readonly synchronize: boolean = false;
}

export class SQLiteConfig extends DatabaseConfig {
  override readonly type: "sqlite" = "sqlite" as const;
}

export function toTypeOrmType(
  type: "sqlite" | "postgres"
): "better-sqlite3" | "postgres" {
  return type === "sqlite" ? "better-sqlite3" : "postgres";
}

export class PostgresConfig extends DatabaseConfig {
  override readonly type: "postgres" = "postgres" as const;

  @Description("Host of the database")
  @IsString()
  public readonly host!: string;
  @Description("Port of the database")
  @IsNumber()
  @Type(() => Number)
  public readonly port!: number;
  @Description("Username of the database")
  @IsString()
  public readonly username!: string;
  @Description("Password of the database")
  @IsString()
  public readonly password!: string;
  @Description("SSL configuration of the database")
  @ValidateIf((o) => typeof o.ssl === "object")
  @ValidateNested() // Only validate as nested if it's an object (SSLConfig)
  @Transform(({ value }) => {
    // Check if `value` is an object with `rejectUnauthorized` property
    if (value && typeof value === "object" && "rejectUnauthorized" in value) {
      // If value has `rejectUnauthorized`, transform it to an SSLConfig instance
      return plainToInstance(SSLConfig, value);
    } else {
      // Otherwise, set it to `false`
      return false;
    }
  })
  public readonly ssl: SSLConfig | boolean = false;
}
