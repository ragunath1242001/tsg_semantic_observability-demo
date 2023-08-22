import { Allow, IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Transform, TransformFnParams, Type } from "class-transformer";
import fs from "fs";
import { Logger } from "@nestjs/common";
import { CredentialSubject } from "./model/credential.dto.js";

function fileTransformer(params: TransformFnParams): string | undefined {
  if (typeof params.value === "string") {
    if (params.value.startsWith("file:")) {
      try {
        return fs.readFileSync(params.value.slice(5)).toString();
      } catch (err) {
        Logger.warn(`Could not load ${params.value}: ${err}`, 'Config')
        return undefined;
      }
    }
    return params.value;
  }
  return `${params.value}`;
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

export class KeyConfig {
  @IsString()
  @IsIn(['EdDSA','ES384','X509'])
  public readonly type!: 'EdDSA' | 'ES384' | 'X509'

  @IsString()
  public readonly id!: string

  @IsBoolean()
  public readonly default: boolean = false

  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingKey?: string

  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingCertificate?: string
}

export class CredentialConfig {
  @IsString({each: true})
  @IsOptional()
  public readonly context: string[] = []
  
  @IsString({each: true})
  @IsOptional()
  public readonly type: string[] = []

  @IsString()
  public readonly id!: string

  @IsString()
  @IsOptional()
  public readonly keyId?: string

  // @Transform(({value}) => value)
  @Allow()
  public readonly credentialSubject!: CredentialSubject
}

export abstract class DatabaseConfig {
  @IsString()
  @IsIn(["sqlite", "postgres"])
  public readonly type: 'sqlite' | 'postgres' = 'sqlite'

  @IsString()
  public readonly database!: string
}

export class SQLiteConfig extends DatabaseConfig {
  override readonly type: 'sqlite' = 'sqlite';
}

export class PostgresConfig extends DatabaseConfig {
  override readonly type: 'postgres' = 'postgres';

  @IsString()
  public readonly host!: string
  @IsNumber()
  public readonly port!: number
  @IsString()
  public readonly username!: string
  @IsString()
  public readonly password!: string
}

export class RootConfig {
  @ValidateNested()
  @Type(() => ServerConfig)
  public readonly server!: ServerConfig;

  @ValidateNested({each: true})
  @Type(() => KeyConfig)
  public readonly keys!: KeyConfig[];

  @ValidateNested({each: true})
  @Type(() => CredentialConfig)
  public readonly credentials!: CredentialConfig[];

  @IsString()
  public readonly storageLocation: string = './storage/';

  @ValidateNested()
  @Type(() => DatabaseConfig, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: SQLiteConfig, name: 'sqlite'},
        { value: PostgresConfig, name: 'postgres'}
      ]
    }
  })
  public readonly db!: DatabaseConfig
}