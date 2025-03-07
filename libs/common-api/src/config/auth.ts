import { Transform } from "class-transformer";
import { IsBoolean, IsString, IsUrl, ValidateIf } from "class-validator";

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
  @Description("Client secret")
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientSecret!: string;
  @Description("JSON path to extract roles from the token")
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly rolePath: string = "$.roles[*]";
}
