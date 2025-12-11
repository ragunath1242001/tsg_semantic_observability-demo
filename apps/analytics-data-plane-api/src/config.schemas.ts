import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { RuntimeConfig } from "./config.js";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty({ example: "#3B8BF6" })
  color: string = "#3B8BF6";
  @ApiPropertyOptional({ example: "https://example.com/darktheme.png" })
  darkThemeUrl?: string;
  @ApiPropertyOptional({ example: "https://example.com/lighttheme.png" })
  lightThemeUrl?: string;
  @ApiPropertyOptional({
    description:
      "Whether a project agreement is required when creating an algorithm instance",
    example: false
  })
  requireProjectAgreement: boolean = false;
}
