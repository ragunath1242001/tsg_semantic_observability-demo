import { DynamicModule, Module } from "@nestjs/common";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileMetadataDao } from "./filesMetadata.dao.js";
import fs from "fs";
import path from "path";
import { FilesConfig } from "../config.js";
import { DataPlaneTestModule } from "../dataplane/dataplane.module.js";

@Module({})
export class FilesModule {
  static register(filesConfig: FilesConfig): DynamicModule {
    const UPLOAD_DIR = filesConfig.path;
    const fileFilter = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _req: any,
      file: { originalname: string },
      cb: (arg0: null, arg1: boolean) => void
    ) => {
      if (fs.existsSync(path.join(UPLOAD_DIR, file.originalname))) {
        cb(null, false);
        return;
      }
      cb(null, true);
    };

    const module: DynamicModule = {
      module: FilesModule,
      imports: [
        TypeOrmModule.forFeature([FileMetadataDao]),
        DataPlaneTestModule,
        MulterModule.register({
          storage: diskStorage({
            destination: function (_req, _file, cb) {
              if (!fs.existsSync(UPLOAD_DIR)) {
                fs.mkdirSync(UPLOAD_DIR);
              }
              cb(null, UPLOAD_DIR);
            },
            filename: function (_req, file, cb) {
              cb(null, file.originalname);
            }
          }),
          fileFilter: fileFilter
        })
      ],
      controllers: [FilesController],
      providers: [FilesService]
    };
    return module;
  }
}
