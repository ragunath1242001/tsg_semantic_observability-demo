import { ApiProperty } from "@nestjs/swagger";
import { RuntimeConfig } from "./config.js";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty()
  gaiaXSupport!: boolean;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  color: string = "#3B8BF6";
  @ApiProperty()
  darkThemeUrl?: string;
  @ApiProperty()
  lightThemeUrl?: string;
}
