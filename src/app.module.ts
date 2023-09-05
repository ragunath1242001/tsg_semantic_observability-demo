import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module";
import { ConfigModule } from "./config.module";

@Module({
  imports: [
    DataPlaneTestModule,
    ConfigModule
  ],
  exports: [
    DataPlaneTestModule
  ]
})
export class AppModule {}