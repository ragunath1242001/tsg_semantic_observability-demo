import { ApiProperty } from "@nestjs/swagger";
import { RuntimeConfig } from "./config.js";

export class RuntimeConfigDto implements RuntimeConfig {
  @ApiProperty()
  gaiaXSupport!: boolean;
}
