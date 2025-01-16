import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContextController } from "./context.controller.js";
import { ContextManagementController } from "./context.management.controller.js";
import { ContextService } from "./context.service.js";
import { JSONLDContext } from "../model/context.dao.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    AuthModule.register(RootConfig),
    TypeOrmModule.forFeature([JSONLDContext])
  ],
  controllers: [ContextController, ContextManagementController],
  providers: [ContextService],
  exports: [ContextService]
})
export class ContextModule {}
