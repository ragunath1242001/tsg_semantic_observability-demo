import { ApiProperty } from "@nestjs/swagger";

import { DidServiceConfig } from "../config.js";

export class DidServiceConfigDto implements DidServiceConfig {
  @ApiProperty({ example: "b86483f3-3792-4a54-b11e-f1c6face9935" })
  id!: string;
  @ApiProperty({ example: "connector" })
  type!: string;
  @ApiProperty({ example: "https://dataspace.example/connector" })
  serviceEndpoint!: string;
}
