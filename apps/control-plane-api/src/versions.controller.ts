import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { VersionSchema } from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";

import { RootConfig } from "./config.js";

@Controller()
export class VersionsController {
  constructor(private readonly config: RootConfig) {}

  @Get(".well-known/dspace-version")
  @ApiOperation({
    summary: "Retrieve the protocol version metadata",
    description: "Returns the protocol version of the control plane."
  })
  @ApiOkResponse({ type: VersionSchema })
  getVersions(): VersionSchema {
    return plainToInstance<VersionSchema, VersionSchema>(VersionSchema, {
      protocolVersions: [
        {
          version: "2025-1",
          path: `${this.config.server.subPath ?? ""}/api`,
          binding: "HTTPS",
          auth: {
            protocol: this.config.iam.protocol,
            version: this.config.iam.version,
            profile: this.config.iam.profile
          }
        }
      ]
    });
  }
}
