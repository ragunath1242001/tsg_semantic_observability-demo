import { IsNumber, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ServerConfig {
  @IsString()
  public readonly listen: string = '0.0.0.0';
  @IsNumber()
  @Type()
  public readonly port: number = 3000;
  @IsString()
  public readonly publicAddress: string = 'http://localhost:3000';
}

export class RootConfig {
  @ValidateNested()
  @Type(() => ServerConfig)
  public readonly server!: ServerConfig;
}