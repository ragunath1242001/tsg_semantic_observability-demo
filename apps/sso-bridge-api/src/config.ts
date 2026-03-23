import {
  AuditModuleConfig,
  DatabaseConfig,
  Description,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig
} from "@tsg-dsp/common-api";
import { DcqlQuery } from "@tsg-dsp/common-dtos";
import { ClientAuthMethod, GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

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

  @Description("Initial client configurations")
  @ValidateNested({ each: true })
  @Type(() => InitClient)
  @IsOptional()
  public readonly initClients: InitClient[] = [];

  @Description("Initial user configurations")
  @ValidateNested({ each: true })
  @Type(() => InitUser)
  @IsOptional()
  public readonly initUsers: InitUser[] = [];

  @Description("Kubernetes namespace")
  @IsString()
  public readonly kubernetesNamespace: string = "default";

  @Description(
    "Issuer name for Two-Factor Authentication (shown in authenticator apps)"
  )
  @IsString()
  @IsOptional()
  public readonly twoFactorIssuerName: string = "SSO Bridge";

  @Description("DCQL Query map for OID4VP")
  @IsOptional()
  public readonly dcqlQueryMap: Record<string, DcqlQuery> = {
    Administrator: {
      credentials: [
        {
          id: "identity_credential",
          format: "jwt_vc_json",
          meta: {
            type_values: [["VerifiableCredential", "HandsonCredential"]]
          },
          claims: [
            {
              id: "email",
              path: ["credentialSubject", "email"]
            },
            {
              id: "role",
              path: ["credentialSubject", "role"],
              values: ["Administrator"]
            }
          ]
        }
      ]
    },
    User: {
      credentials: [
        {
          id: "identity_credential",
          format: "jwt_vc_json",
          meta: {
            type_values: [["VerifiableCredential", "HandsonCredential"]]
          },
          claims: [
            {
              id: "email",
              path: ["credentialSubject", "email"]
            }
          ]
        }
      ]
    }
  };

  @Description("Audit logging configuration")
  @ValidateNested()
  @Type(() => AuditModuleConfig)
  @IsOptional()
  public readonly audit: AuditModuleConfig = new AuditModuleConfig();
}

export class InitClient {
  @Description("Client ID")
  @IsString()
  clientId!: string;
  @Description("Client secret (required for client_secret_post authentication)")
  @IsString()
  @IsOptional()
  clientSecret?: string;
  @Description(
    "Token endpoint authentication method: client_secret_post, private_key_jwt, or none"
  )
  @IsString()
  @IsIn(["client_secret_post", "private_key_jwt", "none"])
  @IsOptional()
  tokenEndpointAuthMethod?: ClientAuthMethod = "client_secret_post";
  @Description(
    "Public key in JWK format (required for private_key_jwt authentication)"
  )
  @IsObject()
  @IsOptional()
  jwk?: Record<string, any>;
  @Description("Kubernetes secret name")
  @IsString()
  secretName!: string;
  @Description(
    "Client permissions (can be permission strings or permission set names)"
  )
  @IsString({ each: true })
  @ArrayNotEmpty()
  permissions!: string[];
  @Description("Client grants types supported")
  @IsString({ each: true })
  @ArrayNotEmpty()
  @IsOptional()
  grants: GrantType[] = ["client_credentials"];
  @Description("Client name")
  @IsString()
  name!: string;
  @Description("Client description")
  @IsString()
  description!: string;
  @Description("Allowed Client redirect URIs regex")
  @IsString({ each: true })
  redirectUris!: string[];
}

export class InitUser {
  @Description("Username")
  @IsString()
  username!: string;
  @Description("Password")
  @IsString()
  password!: string;
  @Description("Email")
  @IsString()
  @IsEmail()
  email!: string;
  @Description(
    "User permissions (can be permission strings or permission set names)"
  )
  @IsString({ each: true })
  @ArrayNotEmpty()
  permissions!: string[];
  @Description("Grant types supported")
  @IsString({ each: true })
  @ArrayNotEmpty()
  @IsOptional()
  grants: GrantType[] = ["authorization_code", "refresh_token"];
  @Description(
    "Require two-factor authentication for this user. User will be prompted to set up 2FA on first login."
  )
  @IsBoolean()
  @IsOptional()
  require2FA?: boolean = false;
}
