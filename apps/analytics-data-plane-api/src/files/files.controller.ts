import {
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { FilesService } from "./files.service.js";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { FileMetadataDao } from "./filesMetadata.dao.js";
import { Roles } from "../auth/roles.guard.js";

@Controller("files")
@Roles("controlplane_dataplane")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async getFiles(): Promise<FileMetadataDao[]> {
    return this.filesService.getAllFileMetadata();
  }

  @Post("upload")
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    return await this.filesService.uploadFiles(files);
  }

  @Post("sync")
  async syncFiles() {
    return await this.filesService.syncFiles();
  }
}
