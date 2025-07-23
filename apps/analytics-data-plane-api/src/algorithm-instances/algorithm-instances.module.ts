import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesController } from "./algorithm-instances.controller.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([AlgorithmInstanceDao]), AuthModule],
  controllers: [AlgorithmInstancesController],
  providers: [AlgorithmInstancesService],
  exports: [AlgorithmInstancesService]
})
export class AlgorithmInstancesModule {}
