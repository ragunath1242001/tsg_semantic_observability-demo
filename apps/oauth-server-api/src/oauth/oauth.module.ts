import { Module } from "@nestjs/common";
import { OauthService } from "./oauth.service.js";
import { OauthController } from "./oauth.controller.js";
import { MetadataController } from "./metadata.controller.js";

@Module({
  providers: [OauthService],
  controllers: [OauthController, MetadataController]
})
export class OauthModule {}
