import { ApiProperty } from "@nestjs/swagger";
import { RuntimeConfig } from "./config";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty()
  controlPlaneInteractions!: "automatic" | "semi-manual" | "manual";
}
