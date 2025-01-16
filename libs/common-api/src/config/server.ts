import { Type } from "class-transformer";
import { IsString, IsOptional, IsNumber } from "class-validator";

export class ServerConfig {
  @IsString()
  @IsOptional()
  public readonly listen: string = "0.0.0.0";
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  public readonly port: number = 3000;
  @IsString()
  @IsOptional()
  public readonly publicDomain: string = "localhost";
  @IsString()
  @IsOptional()
  public readonly publicAddress: string = `http://localhost:3000`;
  @IsString()
  @IsOptional()
  public readonly subPath?: string;
}
