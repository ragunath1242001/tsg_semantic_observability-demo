import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeConfig } from "./config";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty()
  color: string = "#3B8BF6";
  @ApiPropertyOptional()
  darkThemeUrl?: string;
  @ApiPropertyOptional()
  lightThemeUrl?: string;
}
