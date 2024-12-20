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
  ValidateNested
} from "class-validator";
import {
  plainToInstance,
  Transform,
  TransformFnParams,
  Type
} from "class-transformer";
import fs from "fs";
import { Logger } from "@nestjs/common";
import { CredentialSubject } from "@tsg-dsp/common-dsp";
import { DIDMethod, DIDMethodList, DIDMethodTypes } from "./utils/did.js";

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

const valueToBoolean = (params: TransformFnParams): boolean | undefined => {
  if (params.value === null || params.value === undefined) {
    return undefined;
  }
  if (typeof params.value === "boolean") {
    return params.value;
  }
  if (["true", "on", "yes", "1"].includes(params.value.toLowerCase())) {
    return true;
  }
  if (["false", "off", "no", "0"].includes(params.value.toLowerCase())) {
    return false;
  }
  return undefined;
};

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

export class AuthConfig {
  @IsBoolean()
  @Transform(valueToBoolean)
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
  @Type(() => Number)
  @IsOptional()
  public readonly port: number = 3000;
  @IsString()
  @IsOptional()
  public readonly publicDomain: string = "localhost";
  @IsString()
  @IsOptional()
  public readonly publicAddress: string = `http://localhost:3000`;
  @IsString()
  @IsOptional()
  public readonly subPath?: string;
}

export class InitKeyConfig {
  @IsString()
  @IsIn(["EdDSA", "ES384", "X509"])
  public readonly type!: "EdDSA" | "ES384" | "X509";

  @IsString()
  public readonly id!: string;

  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
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
  @Transform(valueToBoolean)
  public readonly issuable!: boolean;

  @IsString()
  @IsOptional()
  public readonly documentUrl?: string;

  @IsObject()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly document?: Record<string, any>;

  @IsObject()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly schema?: Record<string, any>;
}

export class OID4VCIConfig {
  @ValidateNested({ each: true })
  @Type(() => IssuerConfig)
  public readonly issuer: IssuerConfig[] = [];

  @ValidateNested({ each: true })
  @Type(() => HolderConfig)
  public holder: HolderConfig[] = [];
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
  @IsUrl({ require_tld: true, require_protocol: true, require_host: false })
  public readonly serviceEndpoint!: string;
}

export enum PresentationType {
  DIRECT = "DIRECT",
  IATP = "IATP",
  OID4VP = "OID4VP"
}

export class PresentationConfig {
  @IsOptional()
  @IsEnum(PresentationType, { each: true })
  public readonly types: PresentationType[] = [
    PresentationType.DIRECT,
    PresentationType.IATP
  ];
}

export class RuntimeConfig {
  @IsOptional()
  @IsBoolean()
  @Transform(valueToBoolean)
  public gaiaXSupport: boolean = false;

  @IsOptional()
  @IsString()
  public title?: string;
}

export class DidConfig {
  @IsString()
  @IsIn(DIDMethodList)
  public readonly method: DIDMethodTypes = DIDMethod.WEB;

  @IsString()
  @IsIn(["JWK", "Multikey"])
  public readonly keyFormat: "JWK" | "Multikey" = "JWK";
}

export enum SignatureType {
  DATA_INTEGRITY_PROOF = "DATA_INTEGRITY_PROOF",
  JSON_WEB_SIGNATURE_2020 = "JSON_WEB_SIGNATURE_2020"
}

export class SignatureConfig {
  @IsEnum(SignatureType)
  @IsOptional()
  public default: SignatureType = SignatureType.DATA_INTEGRITY_PROOF;
  @IsEnum(SignatureType)
  @IsOptional()
  public credentials: SignatureType = SignatureType.DATA_INTEGRITY_PROOF;
  @IsEnum(SignatureType)
  @IsOptional()
  public presentations: SignatureType = SignatureType.DATA_INTEGRITY_PROOF;
}

export class RootConfig {
  @ValidateNested()
  @IsDefined({
    message: "Either sqlite or postgres DB config must be provided"
  })
  @Type(() => DatabaseConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: SQLiteConfig, name: "sqlite" },
        { value: PostgresConfig, name: "postgres" }
      ]
    }
  })
  public readonly db!: DatabaseConfig;

  @ValidateNested()
  @IsDefined({
    message: "OAuth2.0 configuration must be provided"
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

  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsOptional()
  public readonly runtime: RuntimeConfig = new RuntimeConfig();

  @ValidateNested()
  @Type(() => DidConfig)
  @IsOptional()
  public readonly did: DidConfig = new DidConfig();

  @ValidateNested()
  @Type(() => SignatureConfig)
  @IsOptional()
  public readonly signature: SignatureConfig = new SignatureConfig();
}
