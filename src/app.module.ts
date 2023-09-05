import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module";
import { ConfigModule } from "./config.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    DataPlaneTestModule,
    ConfigModule
  ],
  exports: [
    DataPlaneTestModule
  ],
  controllers: [
    HealthController
  ]
})
export class AppModule {}