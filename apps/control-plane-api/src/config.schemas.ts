import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeConfig } from "./config.js";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty({ example: "automatic" })
  controlPlaneInteractions!: "automatic" | "semi-manual" | "manual";
  @ApiProperty({ example: "#3B8BF6" })
  color: string = "#3B8BF6";
  @ApiPropertyOptional({ example: "https://example.com/darktheme.png" })
  darkThemeUrl?: string;
  @ApiPropertyOptional({ example: "https://example.com/lighttheme.png" })
  lightThemeUrl?: string;
}
