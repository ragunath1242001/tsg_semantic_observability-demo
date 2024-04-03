import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsDefined,
  IsUrl,
  Matches,
  ArrayMinSize,
  IsIn,
} from "class-validator";

export abstract class DatabaseConfig {
  @IsString()
  @IsIn(["sqlite", "postgres"])
  public readonly type!: "sqlite" | "postgres";

  @IsString()
  public readonly database!: string;
}

export class SQLiteConfig extends DatabaseConfig {
  override readonly type: "sqlite" = "sqlite" as const;
}

export class PostgresConfig extends DatabaseConfig {
  override readonly type: "postgres" = "postgres" as const;

  @IsString()
  public readonly host!: string;
  @IsNumber()
  public readonly port!: number;
  @IsString()
  public readonly username!: string;
  @IsString()
  public readonly password!: string;
}

export class ServerConfig {
  @IsString()
  public readonly listen: string = "0.0.0.0";
  @IsNumber()
  @Type()
  public readonly port: number = 3001;
  @IsString()
  public readonly publicDomain: string = "localhost";
  @IsString()
  public readonly publicAddress: string = `http://localhost:3001`;
}

export class ControlPlaneConfig {
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly dataPlaneEndpoint!: string;
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly managementEndpoint!: string;
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly controlEndpoint!: string;
  @IsString()
  public readonly authorization!: string;
  @IsNumber()
  public readonly initializationDelay: number = 5000;
}

export class UserConfig {
  @IsString()
  public readonly username!: string;

  @IsString()
  @Matches(/^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/g)
  public readonly password!: string;
}

export class DatasetConfig {
  @IsString()
  @IsOptional()
  public readonly id?: string;

  @IsString()
  @IsDefined()
  public readonly title!: string;

  @ValidateNested()
  @Type(() => DistributionConfig)
  @ArrayMinSize(1)
  public readonly distributions!: DistributionConfig[];
}

export class DistributionConfig {
  @IsString()
  @IsOptional()
  public readonly id?: string;

  @IsString()
  @IsUrl({ require_tld: false })
  public readonly backend!: string;

  @IsString()
  public readonly version!: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  public readonly openApiSpec?: string;

  @IsString()
  @IsOptional()
  public readonly authorization?: string;
}

export class RootConfig {
  @ValidateNested()
  @IsDefined({
    message: "Either sqlite or postgres DB config must be provided",
  })
  @Type(() => DatabaseConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: SQLiteConfig, name: "sqlite" },
        { value: PostgresConfig, name: "postgres" },
      ],
    },
  })
  public readonly db!: DatabaseConfig;

  @ValidateNested()
  @IsOptional()
  @Type(() => ServerConfig)
  public readonly server: ServerConfig = new ServerConfig();

  @ValidateNested()
  @IsDefined()
  @Type(() => ControlPlaneConfig)
  public readonly controlPlane!: ControlPlaneConfig;

  @ValidateNested()
  @Type(() => UserConfig)
  @ArrayMinSize(1)
  public readonly users!: UserConfig[];

  @ValidateNested()
  @Type(() => DatasetConfig)
  @IsDefined()
  public readonly dataset!: DatasetConfig;
}
