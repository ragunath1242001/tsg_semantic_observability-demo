import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataplane.service";
import { TransferDao } from "./transfer.dao";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao";
import { DataPlaneManagementController } from "./dataplane.management.controller";
import { ProxyController } from "./proxy.controller";
import { AuthModule } from "../auth/auth.module";
// import { AuthController } from "../auth/auth.controller";
// import { PassportModule } from "@nestjs/passport";
// import { OAuthStrategy } from "../auth/oauth.strategy";
// import { SessionSerializer } from "../auth/session.serializer";
// import { OAuthBearerStrategy } from "../auth/oauth.bearer.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao]),
    AuthModule,
    // PassportModule.register({ session: true }),
  ],
  controllers: [
    DataPlaneController,
    DataPlaneManagementController,
    ProxyController,
    // AuthController,
  ],
  providers: [
    DataPlaneService,
    // OAuthStrategy,
    // OAuthBearerStrategy,
    // SessionSerializer,
  ],
})
export class DataPlaneTestModule {}
