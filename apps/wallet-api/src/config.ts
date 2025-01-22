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
import { DIDMethod, DIDMethodList, DIDMethodTypes } from "./utils/did.js";
import { CredentialSubject } from "@tsg-dsp/common-dsp/dist/model/ssi/credentials.dto.js";
import {
  AuthConfig,
  DatabaseConfig,
  fileTransformer,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig,
  valueToBoolean
} from "@tsg-dsp/common-api";

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

  @IsBoolean()
  @IsOptional()
  public readonly revocable: boolean = true;

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
  DCP = "DCP",
  OID4VP = "OID4VP"
}

export class PresentationConfig {
  @IsOptional()
  @IsEnum(PresentationType, { each: true })
  public readonly types: PresentationType[] = [
    PresentationType.DIRECT,
    PresentationType.DCP
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

  @IsString()
  public color: string = "#3B8BF6";
  @IsOptional()
  @IsString()
  lightThemeUrl?: string;
  @IsOptional()
  @IsString()
  darkThemeUrl?: string;
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
  @IsDefined()
  public readonly runtime!: RuntimeConfig;

  @ValidateNested()
  @Type(() => DidConfig)
  @IsOptional()
  public readonly did: DidConfig = new DidConfig();

  @ValidateNested()
  @Type(() => SignatureConfig)
  @IsOptional()
  public readonly signature: SignatureConfig = new SignatureConfig();
}
