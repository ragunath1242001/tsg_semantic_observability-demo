import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { FilesService } from "./files.service.js";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { CSVW, FileMetadataDto } from "./files.dto.js";
import { Roles } from "@tsg-dsp/common-api";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

@Controller("files")
@Roles("controlplane_dataplane")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @ApiOperation({
    summary: "Get all files",
    description: "Get all files and their metadata."
  })
  @ApiOkResponse({ type: [FileMetadataDto] })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async getFiles(): Promise<FileMetadataDto[]> {
    return this.filesService.getAllFileMetadata();
  }

  @Post("upload")
  @ApiOperation({
    summary: "Upload files",
    description: "Upload files and create metadata."
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    await this.filesService.uploadFiles(files);
    return await this.filesService.createMetadata(files);
  }

  @Post("sync")
  @ApiOperation({
    summary: "Sync files",
    description: "Sync files and their metadata."
  })
  @ApiForbiddenResponseDefault()
  async syncFiles() {
    return await this.filesService.syncFiles();
  }

  @Get(":id/csvw")
  @ApiOperation({
    summary: "Get CSVW",
    description: "Get the CSVW of a file."
  })
  @ApiForbiddenResponseDefault()
  @ApiOkResponse({ type: CSVW })
  @HttpCode(HttpStatus.OK)
  async getCSVW(@Param("id") id: string): Promise<CSVW> {
    return await this.filesService.getCSVW(id);
  }
}
