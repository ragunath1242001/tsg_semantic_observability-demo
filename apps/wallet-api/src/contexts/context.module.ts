import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContextController } from "./context.controller.js";
import { ContextManagementController } from "./context.management.controller.js";
import { ContextService } from "./context.service.js";
import { JSONLDContext } from "../model/context.dao.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([JSONLDContext])],
  controllers: [ContextController, ContextManagementController],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
