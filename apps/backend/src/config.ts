import {
  Allow,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Transform, TransformFnParams, Type } from "class-transformer";
import fs from "fs";
import { Logger } from "@nestjs/common";
import { CredentialSubject } from "@tsg-dsp/common";
import { AppRole } from "@libs/dtos";

function fileTransformer(params: TransformFnParams): string | undefined {
  if (typeof params.value === "string") {
    if (params.value.startsWith("file:")) {
      try {
        return fs.readFileSync(params.value.slice(5)).toString();
      } catch (err) {
        Logger.warn(`Could not load ${params.value}: ${err}`, "Config");
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

export class AuthConfig {
  @IsBoolean()
  public readonly enabled: boolean = true;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly authorizationURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly tokenURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly introspectionURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly callbackURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly redirectURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientId!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientSecret!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientUsername!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientPassword!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly rolePath: string = "$.roles[*].name";
}

export class ServerConfig {
  @IsString()
  @IsOptional()
  public readonly listen: string = "0.0.0.0";
  @IsNumber()
  @Type()
  @IsOptional()
  public readonly port: number = 3000;
  @IsString()
  @IsOptional()
  public readonly publicDomain: string = "localhost";
  @IsString()
  @IsOptional()
  public readonly publicAddress: string = `http://localhost:3000`;
}

export class InitKeyConfig {
  @IsString()
  @IsIn(["EdDSA", "ES384", "X509"])
  public readonly type!: "EdDSA" | "ES384" | "X509";

  @IsString()
  public readonly id!: string;

  @IsBoolean()
  @IsOptional()
  public readonly default: boolean = false;

  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingKey?: string;

  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingCertificate?: string;
}

export class InitCredentialConfig {
  @IsString({ each: true })
  @IsOptional()
  public readonly context: string[] = [];

  @IsString({ each: true })
  @IsOptional()
  public readonly type: string[] = [];

  @IsString()
  public readonly id!: string;

  @IsString()
  @IsOptional()
  public readonly keyId?: string;

  @Allow()
  public readonly credentialSubject!: CredentialSubject;
}

export class TrustAnchorConfig {
  @IsString()
  public readonly identifier!: string;

  @IsString({ each: true })
  public readonly credentialTypes: string[] = [];
}

export class JsonLdContextConfig {
  @IsString()
  public readonly id!: string;

  @IsString()
  public readonly credentialType!: string;

  @IsBoolean()
  public readonly issuable!: boolean;

  @IsString()
  @IsOptional()
  public readonly documentUrl?: string;

  @IsObject()
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public readonly document?: Record<string, any>;

  @IsObject()
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public readonly schema?: Record<string, any>;
}

export class OID4VCIConfig {
  @ValidateNested({ each: true })
  @Type(() => IssuerConfig)
  public readonly issuer: IssuerConfig[] = [];

  @ValidateNested({ each: true })
  @Type(() => HolderConfig)
  public readonly holder: HolderConfig[] = [];
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

  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly issuerUrl!: string;

  @IsString()
  public readonly credentialType!: string;
}

export class DidServiceConfig {
  @IsString()
  public readonly id!: string;

  @IsString()
  public readonly type!: string;

  @IsString()
  public readonly serviceEndpoint!: string;
}

export enum PresentationType {
  DIRECT = "DIRECT",
  IATP = "IATP",
  OID4VP = "OID4VP",
}

export class PresentationConfig {
  @IsOptional()
  @IsEnum(PresentationType, { each: true })
  public readonly types: PresentationType[] = [
    PresentationType.DIRECT,
    PresentationType.IATP,
  ];
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
  @IsDefined({
    message: "OAuth2.0 configuration must be provided",
  })
  @Type(() => AuthConfig)
  public readonly auth!: AuthConfig;

  @ValidateNested()
  @Type(() => ServerConfig)
  @IsOptional()
  public readonly server: ServerConfig = new ServerConfig();

  @ValidateNested({ each: true })
  @Type(() => InitKeyConfig)
  @IsOptional()
  public readonly initKeys: InitKeyConfig[] = [];

  @ValidateNested({ each: true })
  @Type(() => InitCredentialConfig)
  @IsOptional()
  public readonly initCredentials: InitCredentialConfig[] = [];

  @ValidateNested({ each: true })
  @Type(() => TrustAnchorConfig)
  @IsOptional()
  public readonly trustAnchors: TrustAnchorConfig[] = [];

  @ValidateNested({ each: true })
  @Type(() => JsonLdContextConfig)
  public readonly contexts: JsonLdContextConfig[] = [];

  @ValidateNested()
  @Type(() => OID4VCIConfig)
  public readonly oid4vci: OID4VCIConfig = new OID4VCIConfig();

  @ValidateNested({ each: true })
  @Type(() => DidServiceConfig)
  public readonly didServices: DidServiceConfig[] = [];

  @ValidateNested()
  @Type(() => PresentationConfig)
  public readonly presentation: PresentationConfig = new PresentationConfig();
}
