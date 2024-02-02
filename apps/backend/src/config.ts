import 'reflect-metadata';
import { ArrayMinSize, IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString, IsUrl, Matches, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export abstract class DatabaseConfig {
  @IsString()
  @IsIn(["sqlite", "postgres"])
  public readonly type!: 'sqlite' | 'postgres';

  @IsString()
  public readonly database!: string
}

export class SQLiteConfig extends DatabaseConfig {
  override readonly type: 'sqlite' = 'sqlite' as const;
}

export class PostgresConfig extends DatabaseConfig {
  override readonly type: 'postgres' = 'postgres' as const;

  @IsString()
  public readonly host!: string
  @IsNumber()
  public readonly port!: number
  @IsString()
  public readonly username!: string
  @IsString()
  public readonly password!: string
}

export class ServerConfig {
  @IsString()
  public readonly listen: string = '0.0.0.0';
  @IsNumber()
  @Type()
  public readonly port: number = 3000;
  @IsString()
  public readonly publicDomain: string = 'localhost';
  @IsString()
  public readonly publicAddress: string = `http://localhost:3000`;
}

export class IamConfig {
  @IsString()
  public readonly didId!: string

  @IsString()
  @IsIn(['tsg', 'miw'])
  public readonly type!: 'tsg' | 'miw'

  @IsString()
  @IsUrl({require_tld: false, require_protocol: true, require_host: false})
  public readonly tokenUrl!: string
  
  @IsString()
  @IsUrl({require_tld: false, require_protocol: true, require_host: false})
  public readonly presentationUrl!: string

  @IsString()
  @IsUrl({require_tld: false, require_protocol: true, require_host: false})
  @IsOptional()
  public readonly walletUrl?: string
  
  @IsString()
  @IsUrl({require_tld: false, require_protocol: true, require_host: false})
  public readonly validationUrl!: string

  @IsString()
  public readonly clientId!: string

  @IsString()
  public readonly clientSecret!: string

  @IsString()
  public readonly credentialId!: string

  @IsString({each: true})
  public readonly validations!: string[]
}

export class UserConfig {
  @IsString()
  public readonly username!: string;

  @IsString()
  @Matches(/^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/g)
  public readonly password!: string
}

export class InitCatalog {
  @IsString()
  public readonly creator!: string
  @IsString()
  public readonly publisher!: string
  @IsString()
  public readonly title!: string
  @IsString()
  public readonly description!: string
  @IsArray()
  @IsString({each: true})
  @IsOptional()
  public datasets?: string[]

}

export class RootConfig {
  @ValidateNested()
  @IsDefined({message: 'Either sqlite or postgres DB config must be provided'})
  @Type(() => DatabaseConfig, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: SQLiteConfig, name: 'sqlite'},
        { value: PostgresConfig, name: 'postgres'}
      ],

    }
  })
  public readonly db!: DatabaseConfig

  @ValidateNested()
  @IsOptional()
  @Type(() => ServerConfig)
  public readonly server!: ServerConfig;

  @ValidateNested()
  @Type(() => IamConfig)
  @IsDefined()
  public readonly iam!: IamConfig;

  @ValidateNested()
  @Type(() => UserConfig)
  @ArrayMinSize(1)
  public readonly users!: UserConfig[]

  @ValidateNested()
  @Type(() => InitCatalog)
  @IsDefined()
  public readonly initCatalog!: InitCatalog
}