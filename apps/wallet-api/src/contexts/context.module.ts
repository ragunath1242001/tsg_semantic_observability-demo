import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { JSONLDContext } from "../model/context.dao.js";
import { ContextController } from "./context.controller.js";
import { ContextManagementController } from "./context.management.controller.js";
import { ContextService } from "./context.service.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([JSONLDContext])],
  controllers: [ContextController, ContextManagementController],
  providers: [ContextService],
  exports: [ContextService]
})
export class ContextModule {}
