import { Module } from "@nestjs/common";
import { DataPlaneTestModule } from "./dataplane/dataplane.module";
import { ConfigModule, config } from "./config.module";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    DataPlaneTestModule,
    ConfigModule,
    TypeOrmModule.forRoot({
      ...config.db,
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
  exports: [DataPlaneTestModule],
  controllers: [],
})
export class AppModule {}
