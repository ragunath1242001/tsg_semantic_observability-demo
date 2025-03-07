import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

import { Description } from "../utils/configToMarkdown.js";

export class ServerConfig {
  @Description("IP address the server listens on")
  @IsString()
  @IsOptional()
  public readonly listen: string = "0.0.0.0";
  @Description("Port the server listens on")
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  public readonly port: number = 3000;
  @Description("Public domain of the server")
  @IsString()
  @IsOptional()
  public readonly publicDomain: string = "localhost";
  @Description("Public address of the server")
  @IsString()
  @IsOptional()
  public readonly publicAddress: string = `http://localhost:3000`;
  @Description("Sub path of the server")
  @IsString()
  @IsOptional()
  public readonly subPath?: string;
}
