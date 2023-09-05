import { ArrayMinSize, IsDefined, IsIn, IsNumber, IsOptional, IsString, IsUrl, Matches, ValidateNested } from "class-validator";
import { Transform, TransformFnParams, Type } from "class-transformer";
import fs from "fs";
import { Logger } from "@nestjs/common";

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

export class IamConfig {
  @IsString()
  public readonly didId!: string

  @IsString()
  @IsIn(['tsg', 'miw'])
  public readonly type!: 'tsg' | 'miw'

  @IsString()
  @IsUrl()
  public readonly tokenUrl!: string
  
  @IsString()
  @IsUrl()
  public readonly presentationUrl!: string

  @IsString()
  @IsUrl()
  @IsOptional()
  public readonly walletUrl?: string
  
  @IsString()
  @IsUrl()
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
}

export class RootConfig {
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