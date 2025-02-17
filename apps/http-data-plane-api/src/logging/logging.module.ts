import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoggingController } from "./logging.controller.js";
import { EgressLogDao, IngressLogDao } from "./logging.dao.js";
import { LoggingService } from "./logging.service.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([IngressLogDao, EgressLogDao]),
    AuthModule
  ],
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService]
})
export class LoggingModule {}
