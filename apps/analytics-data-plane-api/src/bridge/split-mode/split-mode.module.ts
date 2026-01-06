import { Module } from "@nestjs/common";

import { SplitModeService } from "./split-mode.service.js";

@Module({
  providers: [SplitModeService],
  exports: [SplitModeService]
})
export class SplitModeModule {}
