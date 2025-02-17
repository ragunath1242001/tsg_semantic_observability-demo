import {
  ArrayNotEmpty,
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

import {
  DatabaseConfig,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig
} from "@tsg-dsp/common-api";
import { GrantType } from "@tsg-dsp/sso-bridge-dtos";

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
  @Type(() => ServerConfig)
  @IsOptional()
  public readonly server: ServerConfig = new ServerConfig();

  @ValidateNested({ each: true })
  @Type(() => InitClient)
  @IsOptional()
  public readonly initClients: InitClient[] = [];

  @ValidateNested({ each: true })
  @Type(() => InitUser)
  @IsOptional()
  public readonly initUsers: InitUser[] = [];

  @IsString()
  public readonly kubernetesNamespace: string = "default";
}

export class InitClient {
  @IsString()
  clientId!: string;
  @IsString()
  clientSecret!: string;
  @IsString()
  secretName!: string;
  @IsString({ each: true })
  @ArrayNotEmpty()
  roles!: string[];
  @IsString({ each: true })
  @ArrayNotEmpty()
  @IsOptional()
  grants: GrantType[] = ["client_credentials"];
  @IsString()
  name!: string;
  @IsString()
  description!: string;
  @IsString({ each: true })
  redirectUris!: string[];
}

export class InitUser {
  @IsString()
  username!: string;
  @IsString()
  password!: string;
  @IsEmail()
  email!: string;
  @IsString({ each: true })
  @ArrayNotEmpty()
  roles!: string[];
  @IsString({ each: true })
  @ArrayNotEmpty()
  @IsOptional()
  grants: GrantType[] = ["authorization_code", "refresh_token"];
}
