import { Allow, IsBoolean, IsDefined, IsEmail, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";
import { Transform, TransformFnParams, Type } from "class-transformer";
import fs from "fs";
import { Logger } from "@nestjs/common";
import { CredentialSubject } from "@tsg-dsp/common";
import { AppRole } from "./model/clients.dto.js";

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
  @IsOptional()
  public readonly listen: string = '0.0.0.0';
  @IsNumber()
  @Type()
  @IsOptional()
  public readonly port: number = 3000;
  @IsString()
  @IsOptional()
  public readonly publicDomain: string = 'localhost';
  @IsString()
  @IsOptional()
  public readonly publicAddress: string = `http://localhost:3000`;
}

export class SmtpConfig {
  @IsString()
  public readonly host!: string

  @IsNumber()
  @Type()
  public readonly port!: number

  @IsBoolean()
  @IsOptional()
  public readonly secure: boolean = true

  @IsString()
  public readonly user!: string
  
  @IsString()
  public readonly password!: string

  @IsString()
  public readonly from!: string
}

export class MailConfig {
  @ValidateNested()
  @Type(() => SmtpConfig)
  @IsDefined()
  public readonly smtp!: SmtpConfig

  @IsString()
  public readonly title!: string

  @IsString()
  public readonly dataspace!: string

  @IsString()
  @IsOptional()
  public readonly logo?: string
}

export class InitClientConfig {
  @IsString()
  public readonly id!: string

  @IsString()
  public readonly secret!: string

  @IsEmail()
  public readonly email!: string

  @IsString()
  @IsOptional()
  public readonly didId?: string

  @IsString({each: true})
  @IsIn(Object.values(AppRole), {each: true})
  public readonly roles: AppRole[] = []
}

export class InitKeyConfig {
  @IsString()
  @IsIn(['EdDSA','ES384','X509'])
  public readonly type!: 'EdDSA' | 'ES384' | 'X509'

  @IsString()
  public readonly id!: string

  @IsBoolean()
  @IsOptional()
  public readonly default: boolean = false

  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingKey?: string

  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingCertificate?: string
}

export class InitCredentialConfig {
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

  @Allow()
  public readonly credentialSubject!: CredentialSubject
}

export class TrustAnchorConfig {
  @IsString()
  public readonly identifier!: string

  @IsString({each: true})
  public readonly credentialTypes: string[] = []
}

export class JsonLdContextConfig {
  @IsString()
  public readonly id!: string

  @IsString()
  public readonly credentialType!: string

  @IsBoolean()
  public readonly issuable!: boolean

  @IsString()
  @IsOptional()
  public readonly documentUrl?: string

  @IsObject()
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public readonly document?: Record<string, any>

  @IsObject()
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public readonly schema?: Record<string, any>
}

export class OID4VCIConfig {
  @ValidateNested({each: true})
  @Type(() => IssuerConfig)
  public readonly issuer: IssuerConfig[] = []

  @ValidateNested({each: true})
  @Type(() => HolderConfig)
  public readonly holder: HolderConfig[] = []
}

export class IssuerConfig {
  @IsString()
  public readonly holderId!: string;

  @IsString()
  public readonly credentialType!: string;

  @Allow()
  public readonly credentialSubject!: CredentialSubject;

  @IsString()
  @IsOptional()
  public readonly preAuthorizationCode?: string;
}

export class HolderConfig {
  @IsString()
  public readonly preAuthorizationCode!: string;

  @IsUrl({require_tld: false, require_protocol: true, require_host: false})
  public readonly issuerUrl!: string;

  @IsString()
  public readonly credentialType!: string;
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
  @Type(() => ServerConfig)
  @IsOptional()
  public readonly server: ServerConfig = new ServerConfig();

  @ValidateNested()
  @Type(() => MailConfig)
  @IsOptional()
  public readonly mail?: MailConfig;

  @ValidateNested({each: true})
  @Type(() => InitClientConfig)
  public readonly initClients: InitClientConfig[] = [];

  @ValidateNested({each: true})
  @Type(() => InitKeyConfig)
  @IsOptional()
  public readonly initKeys: InitKeyConfig[] = [];

  @ValidateNested({each: true})
  @Type(() => InitCredentialConfig)
  @IsOptional()
  public readonly initCredentials: InitCredentialConfig[] = [];

  @ValidateNested({each: true})
  @Type(() => TrustAnchorConfig)
  @IsOptional()
  public readonly trustAnchors: TrustAnchorConfig[] = [];

  @ValidateNested({each: true})
  @Type(() => JsonLdContextConfig)
  public readonly contexts: JsonLdContextConfig[] = [];

  @ValidateNested()
  @Type(() => OID4VCIConfig)
  public readonly oid4vci!: OID4VCIConfig;
}