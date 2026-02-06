import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf
} from "class-validator";

import { valueToBoolean } from "../utils/config.js";
import { Description } from "../utils/configToMarkdown.js";

export class AuthConfig {
  @Description("Enable authentication")
  @IsBoolean()
  @Transform(valueToBoolean)
  public readonly enabled: boolean = true;
  @Description("OpenID configuration URL")
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly openIdConfigurationURL!: string;
  @Description("Callback URL the auth service will redirect users")
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly callbackURL!: string;
  @Description("Redirect URL to UI after login/logout")
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly redirectURL!: string;
  @Description("Client ID")
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientId!: string;
  @Description("Client secret (required for client_secret_post authentication)")
  @ValidateIf(
    (c) =>
      c.enabled &&
      (!c.tokenEndpointAuthMethod ||
        c.tokenEndpointAuthMethod === "client_secret_post")
  )
  @IsString()
  @IsOptional()
  public readonly clientSecret?: string;
  @Description(
    "Token endpoint authentication method: client_secret_post (default) or private_key_jwt"
  )
  @ValidateIf((c) => c.enabled)
  @IsIn(["client_secret_post", "private_key_jwt"])
  @IsOptional()
  public readonly tokenEndpointAuthMethod:
    | "client_secret_post"
    | "private_key_jwt" = "client_secret_post";
  @Description(
    "Private key in JWK format for private_key_jwt authentication. Alternative to privateKeyJwkFile."
  )
  @ValidateIf(
    (c) =>
      c.enabled &&
      c.tokenEndpointAuthMethod === "private_key_jwt" &&
      !c.privateKeyJwkFile
  )
  @IsObject()
  @IsOptional()
  public readonly privateKeyJwk?: Record<string, any>;
  @Description(
    "Path to file containing private key JWK for private_key_jwt authentication. Alternative to privateKeyJwk."
  )
  @ValidateIf(
    (c) =>
      c.enabled &&
      c.tokenEndpointAuthMethod === "private_key_jwt" &&
      !c.privateKeyJwk
  )
  @IsString()
  @IsOptional()
  public readonly privateKeyJwkFile?: string;
  @Description("JSON path to extract permissions from the token")
  @ValidateIf((c) => c.enabled)
  @IsString()
  @IsOptional()
  public readonly permissionPath: string = "$.permissions[*]";
}
