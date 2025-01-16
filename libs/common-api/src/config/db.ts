import { Transform, Type, plainToInstance } from "class-transformer";
import {
  IsBoolean,
  IsString,
  IsIn,
  IsOptional,
  IsNumber,
  ValidateIf,
  ValidateNested
} from "class-validator";
import { valueToBoolean } from "../utils/config.js";

export class SSLConfig {
  @Transform(valueToBoolean)
  @IsBoolean()
  public readonly rejectUnauthorized: boolean = false;
}

export abstract class DatabaseConfig {
  @IsString()
  @IsIn(["sqlite", "postgres"])
  public readonly type!: "sqlite" | "postgres";

  @IsString()
  public readonly database!: string;

  @IsBoolean()
  @IsOptional()
  public readonly synchronize: boolean = false;
}

export class SQLiteConfig extends DatabaseConfig {
  override readonly type: "sqlite" = "sqlite" as const;
}

export class PostgresConfig extends DatabaseConfig {
  override readonly type: "postgres" = "postgres" as const;

  @IsString()
  public readonly host!: string;
  @IsNumber()
  @Type(() => Number)
  public readonly port!: number;
  @IsString()
  public readonly username!: string;
  @IsString()
  public readonly password!: string;
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
