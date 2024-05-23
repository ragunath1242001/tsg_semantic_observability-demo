import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { LoggingController } from "./logging.controller";
import { EgressLogDao, IngressLogDao } from "./logging.dao";
import { LoggingService } from "./logging.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([IngressLogDao, EgressLogDao]),
    AuthModule,
  ],
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
