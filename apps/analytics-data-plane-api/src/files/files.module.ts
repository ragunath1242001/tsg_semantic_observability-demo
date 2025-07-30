import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GenericConfigModule } from "@tsg-dsp/common-api";
import fs from "fs";
import { diskStorage } from "multer";

import { RootConfig } from "../config.js";
import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { FileMetadataDao } from "./filesMetadata.dao.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([FileMetadataDao]),
    DataPlaneModule,
    MulterModule.register({
      storage: diskStorage({
        destination: function (_req, _file, cb) {
          if (!fs.existsSync(GenericConfigModule.get(RootConfig).files.path)) {
            fs.mkdirSync(GenericConfigModule.get(RootConfig).files.path);
          }
          cb(null, GenericConfigModule.get(RootConfig).files.path);
        },
        filename: function (_req, file, cb) {
          cb(null, `${Date.now()}-${file.originalname}`);
        }
      })
    })
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService]
})
export class FilesModule {}
