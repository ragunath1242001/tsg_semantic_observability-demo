import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AnalysesController } from "./analyses.controller.js";
import { AnalysesService } from "./analyses.service.js";
import { AnalysisDao } from "./dao/analysis.dao.js";

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisDao])],
  controllers: [AnalysesController],
  providers: [AnalysesService],
  exports: [AnalysesService]
})
export class AnalysesModule {}
