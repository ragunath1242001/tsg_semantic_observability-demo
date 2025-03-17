import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { RuntimeConfig } from "./config.js";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty({ example: false })
  gaiaXSupport!: boolean;
  @ApiProperty({ example: "My Company Wallet" })
  title!: string;
  @ApiProperty({ example: false })
  acceptUnauthenticatedCredentialRequests!: boolean;
  @ApiProperty({ example: false })
  issueMobileCredentials!: boolean;
  @ApiProperty({ example: "#3B8BF6" })
  color: string = "#3B8BF6";
  @ApiPropertyOptional({ example: "https://example.com/darktheme.png" })
  darkThemeUrl?: string;
  @ApiPropertyOptional({ example: "https://example.com/lighttheme.png" })
  lightThemeUrl?: string;
}
