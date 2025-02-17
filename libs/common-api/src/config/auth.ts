import { IsBoolean, ValidateIf, IsUrl, IsString } from "class-validator";
import { valueToBoolean } from "../utils/config.js";
import { Transform } from "class-transformer";

export class AuthConfig {
  @IsBoolean()
  @Transform(valueToBoolean)
  public readonly enabled: boolean = true;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly openIdConfigurationURL!: string;
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
  public readonly rolePath: string = "$.roles[*]";
}
