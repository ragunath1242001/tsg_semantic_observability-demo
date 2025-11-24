import { Description } from "@tsg-dsp/common-api";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUrl } from "class-validator";

export class ControlPlaneConfig {
  @Description("Data plane management endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly dataPlaneEndpoint!: string;

  @Description("Control plane management endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly managementEndpoint!: string;

  @Description("Wallet endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  @IsOptional()
  public readonly walletEndpoint?: string;

  @Description("Public control plane endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly controlEndpoint!: string;

  @Description("Initialization delay in milliseconds")
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  public readonly initializationDelay: number = 5000;

  @Description("Data Plane title")
  @IsString()
  @IsOptional()
  public readonly dataPlaneTitle: string =
    `Data Plane - ${process.env.TSG_MODE === "development" ? "dev" : `v${process.env.TSG_VERSION ?? "0.0.0"}`}`;
}
