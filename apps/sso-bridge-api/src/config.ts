import {
  DatabaseConfig,
  Description,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig
} from "@tsg-dsp/common-api";
import { GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDefined,
  IsEmail,
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

  @Description("Presentation Definition for OID4VP")
  @IsString()
  public readonly presentationDefinition: string = JSON.stringify({
    id: "ac60a5c8-5677-420e-931f-58d769fc3b83",
    input_descriptors: [
      {
        id: "14322c69-1bce-4d7f-b6c2-ecc29b2c123b",
        constraints: {
          fields: [
            {
              path: ["$.type"],
              filter: {
                type: "string",
                pattern: "VerifiableCredential"
              }
            }
          ]
        }
      }
    ]
  });
}

export class InitClient {
  @Description("Client ID")
  @IsString()
  clientId!: string;
  @Description("Client secret")
  @IsString()
  clientSecret!: string;
  @Description("Kubernetes secret name")
  @IsString()
  secretName!: string;
  @Description("Client roles")
  @IsString({ each: true })
  @ArrayNotEmpty()
  roles!: string[];
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
  @Description("User roles")
  @IsString({ each: true })
  @ArrayNotEmpty()
  roles!: string[];
  @Description("Grant types supported")
  @IsString({ each: true })
  @ArrayNotEmpty()
  @IsOptional()
  grants: GrantType[] = ["authorization_code", "refresh_token"];
}
