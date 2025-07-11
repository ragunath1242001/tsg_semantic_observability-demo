import { Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppError } from "@tsg-dsp/common-api";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import { ApiNotFoundResponseDefault } from "@tsg-dsp/common-dtos";
import { Response } from "express";

import { IssueConfigurationService } from "./issue-configuration.service.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Issue Configurations")
export class IssueConfigurationController {
  constructor(
    private readonly issueConfigurationService: IssueConfigurationService
  ) {}

  @Get("issue-configuration/:id")
  @ApiOperation({
    summary: "Retrieve issue configuration document",
    description:
      "Retrieves JSON-LD context document for the given issue configuration"
  })
  @ApiOkResponse({ schema: { type: "object" } })
  async getContext(
    @Param("id") id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any> | void> {
    const issueConfig =
      await this.issueConfigurationService.getIssueConfiguration(id);
    if (issueConfig.document) {
      return issueConfig.document;
    }
    throw new AppError(
      `No context document found for issue configuration ${id}`,
      HttpStatus.NOT_FOUND
    );
  }

  @Get("issue-configuration/:id/background-image")
  @ApiOperation({
    summary: "Retrieve issue configuration background image",
    description:
      "Retrieves background image for the given issue configuration, if available"
  })
  @ApiOkResponse({ schema: { type: "string", format: "binary" } })
  @ApiNotFoundResponseDefault()
  async getBackgroundImage(
    @Param("id") id: string,
    @Res({ passthrough: false }) res: Response
  ): Promise<void> {
    const issueConfig =
      await this.issueConfigurationService.getIssueConfiguration(id);

    if (!issueConfig.backgroundImage) {
      throw new AppError(
        `No background image found for issue configuration ${id}`,
        HttpStatus.NOT_FOUND
      );
    }

    const regex = /^data:(.+\/(.+));base64,(.*)$/;
    const matches = issueConfig.backgroundImage.match(regex);

    if (!matches || matches.length !== 4) {
      res.redirect(issueConfig.backgroundImage);
      return;
    }

    const fullMimeType = matches[1];
    const fileExtension = matches[2];
    const base64Data = matches[3];

    try {
      const imageBuffer = Buffer.from(base64Data, "base64");

      res.set({
        "Content-Type": fullMimeType,
        "Content-Length": imageBuffer.length.toString(),
        "Content-Disposition": `inline; filename="${id}-background.${fileExtension}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: `"${id}-bg"`,
        Expires: new Date(Date.now() + 31536000 * 1000).toUTCString()
      });

      res.send(imageBuffer);
    } catch (_error) {
      throw new AppError(
        `Failed to process background image for issue configuration ${id}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
