import { ApiProperty } from "@nestjs/swagger";
import { DidServiceConfig } from "../config.js";
export class DidServiceConfigDto implements DidServiceConfig {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  type!: string;
  @ApiProperty()
  serviceEndpoint!: string;
}
