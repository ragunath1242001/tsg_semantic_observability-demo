import {
  AuthConfig,
  DatabaseConfig,
  Description,
  fileTransformer,
  NodemailerConfiguration,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig,
  valueToBoolean
} from "@tsg-dsp/common-api";
import { CredentialSubject } from "@tsg-dsp/common-dsp/dist/model/ssi/credentials.dto.js";
import {
  DIDMethod,
  DIDMethodList,
  DIDMethodTypes
} from "@tsg-dsp/common-signing-and-validation";
import { Transform, Type } from "class-transformer";
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested
} from "class-validator";

export class InitKeyConfig {
  @Description("Type of key")
  @IsString()
  @IsIn(["EdDSA", "ES384", "X509"])
  public readonly type!: "EdDSA" | "ES384" | "X509";

  @Description("ID of the key")
  @IsString()
  public readonly id!: string;

  @Description("Default key")
  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
  public readonly default: boolean = false;

  @Description("Existing PKCS#8 encoded key")
  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingKey?: string;

  @Description("Existing PEM encoded certificate")
  @IsOptional()
  @Transform(fileTransformer)
  public readonly existingCertificate?: string;
}

export class InitCredentialConfig {
  @Description("JSON-LD contexts for the credential")
  @IsString({ each: true })
  @IsOptional()
  public readonly context: string[] = [];

  @Description("Types of the verifiable credential")
  @IsString({ each: true })
  @IsOptional()
  public readonly type: string[] = [];

  @Description("ID of the credential")
  @IsString()
  public readonly id!: string;

  @Description("ID of key signing the credential")
  @IsString()
  @IsOptional()
  public readonly keyId?: string;

  @Description("Revocable credential")
  @IsBoolean()
  @IsOptional()
  public readonly revocable: boolean = true;

  @Description("Credential subject")
  @IsObject()
  @Allow()
  public readonly credentialSubject!: CredentialSubject;
}

export class TrustAnchorConfig {
  @Description("DID of the trust anchor")
  @IsString()
  public readonly identifier!: string;

  @Description("Credential types trusted of the trust anchor")
  @IsString({ each: true })
  public readonly credentialTypes: string[] = [];
}

export class JsonLdContextConfig {
  @Description("ID of the context")
  @IsString()
  public readonly id!: string;

  @Description("Credential type associated with the context")
  @IsString()
  public readonly credentialType!: string;

  @Description("Can be issued by this wallet")
  @IsBoolean()
  @Transform(valueToBoolean)
  public readonly issuable!: boolean;

  @Description("URL of the JSON-LD context")
  @IsUrl()
  @IsOptional()
  public readonly documentUrl?: string;

  @Description("JSON-LD context body")
  @IsObject()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly document?: Record<string, any>;

  @Description("JSON-Schema of the JSON-LD context")
  @IsObject()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly schema?: Record<string, any>;
}

export class IssuanceConfig {
  @Description("Issuer configuration")
  @ValidateNested({ each: true })
  @Type(() => IssuerConfig)
  public readonly issuer: IssuerConfig[] = [];

  @Description("DCP Holder configuration")
  @ValidateNested({ each: true })
  @Type(() => DCPHolderConfig)
  public dcp: DCPHolderConfig[] = [];

  @Description("OID4VCI Holder configuration")
  @ValidateNested({ each: true })
  @Type(() => OID4VCIHolderConfig)
  public oid4vci: OID4VCIHolderConfig[] = [];
}

export class IssuerConfig {
  @Description("DID of the holder")
  @IsString()
  public readonly holderId!: string;

  @Description("Credential type to be issued")
  @IsString()
  public readonly credentialType!: string;

  @Description("Credential subject")
  @IsObject()
  @Allow()
  public readonly credentialSubject!: CredentialSubject;

  @Description("Pre-authorized code")
  @IsString()
  @IsOptional()
  public readonly preAuthorizedCode?: string;
}

export class DCPHolderConfig {
  @Description("Pre-authorized code")
  @IsString()
  public readonly preAuthorizedCode!: string;

  @Description("DID identifier of the issuer")
  @IsString()
  public readonly issuerId!: string;

  @Description("Credential type to be issued")
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  public readonly credentialType!: string[];
}

export class OID4VCIHolderConfig {
  @Description("Pre-authorized code")
  @IsString()
  public readonly preAuthorizedCode!: string;

  @Description("Root URL of the issuer")
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly issuerUrl!: string;

  @Description("Credential type(s) to be issued")
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  public readonly credentialType!: string[];
}

export class DidServiceConfig {
  @Description("ID of the service")
  @IsString()
  public readonly id!: string;

  @Description("Type of the service")
  @IsString()
  public readonly type!: string;

  @Description("Service endpoint")
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
  @Description("Types of presentation protocols supported")
  @IsOptional()
  @IsEnum(PresentationType, { each: true })
  public readonly types: PresentationType[] = [
    PresentationType.DIRECT,
    PresentationType.DCP
  ];
}

export class RuntimeConfig {
  @Description("Enable Gaia-X support")
  @IsOptional()
  @IsBoolean()
  @Transform(valueToBoolean)
  public gaiaXSupport: boolean = false;

  @Description("Title of the wallet")
  @IsOptional()
  @IsString()
  public title?: string;

  @Description("Primary color of the wallet")
  @IsString()
  public color: string = "#3B8BF6";
  @Description("Light theme logo URL")
  @IsOptional()
  @IsString()
  lightThemeUrl?: string;
  @Description("Dark theme logo URL")
  @IsOptional()
  @IsString()
  darkThemeUrl?: string;
}

export class DidConfig {
  @Description("Provided DID method")
  @IsString()
  @IsIn(DIDMethodList)
  public readonly method: DIDMethodTypes = DIDMethod.WEB;

  @Description("Provided key format")
  @IsString()
  @IsIn(["JWK", "Multikey"])
  public readonly keyFormat: "JWK" | "Multikey" = "JWK";
}

export enum SignatureType {
  DATA_INTEGRITY_PROOF = "DATA_INTEGRITY_PROOF",
  JSON_WEB_SIGNATURE_2020 = "JSON_WEB_SIGNATURE_2020"
}

export class SignatureConfig {
  @Description("Default signature type")
  @IsEnum(SignatureType)
  @IsOptional()
  public default: SignatureType = SignatureType.DATA_INTEGRITY_PROOF;
  @Description("Signature type for credentials")
  @IsEnum(SignatureType)
  @IsOptional()
  public credentials: SignatureType = SignatureType.DATA_INTEGRITY_PROOF;
  @Description("Signature type for presentations")
  @IsEnum(SignatureType)
  @IsOptional()
  public presentations: SignatureType = SignatureType.DATA_INTEGRITY_PROOF;
}

export class RootConfig {
  @Description("Database configuration")
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

  @Description("Server configuration")
  @ValidateNested()
  @Type(() => ServerConfig)
  @IsOptional()
  public readonly server: ServerConfig = new ServerConfig();

  @Description("Management authentication configuration")
  @ValidateNested()
  @IsDefined({
    message: "Auth configuration must be provided"
  })
  @Type(() => AuthConfig)
  public readonly auth!: AuthConfig;

  @Description("Email configuration")
  @ValidateNested()
  @Type(() => NodemailerConfiguration)
  @IsOptional()
  public readonly email: NodemailerConfiguration =
    new NodemailerConfiguration();

  @Description("Initial key configurations")
  @ValidateNested({ each: true })
  @Type(() => InitKeyConfig)
  @IsOptional()
  public readonly initKeys: InitKeyConfig[] = [];

  @Description("Initial credential configurations")
  @ValidateNested({ each: true })
  @Type(() => InitCredentialConfig)
  @IsOptional()
  public readonly initCredentials: InitCredentialConfig[] = [];

  @Description("Trust anchor configurations")
  @ValidateNested({ each: true })
  @Type(() => TrustAnchorConfig)
  @IsOptional()
  public readonly trustAnchors: TrustAnchorConfig[] = [];

  @Description("JSON-LD context configurations")
  @ValidateNested({ each: true })
  @Type(() => JsonLdContextConfig)
  public readonly contexts: JsonLdContextConfig[] = [];

  @Description("Issuance configuration")
  @ValidateNested()
  @Type(() => IssuanceConfig)
  public readonly issuance: IssuanceConfig = new IssuanceConfig();

  @Description("DID service configurations")
  @ValidateNested({ each: true })
  @Type(() => DidServiceConfig)
  public readonly didServices: DidServiceConfig[] = [];

  @Description("Presentation configuration")
  @ValidateNested()
  @Type(() => PresentationConfig)
  public readonly presentation: PresentationConfig = new PresentationConfig();

  @Description("Runtime configuration")
  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;

  @Description("DID configuration")
  @ValidateNested()
  @Type(() => DidConfig)
  @IsOptional()
  public readonly did: DidConfig = new DidConfig();

  @Description("Signature configuration")
  @ValidateNested()
  @Type(() => SignatureConfig)
  @IsOptional()
  public readonly signature: SignatureConfig = new SignatureConfig();
}
