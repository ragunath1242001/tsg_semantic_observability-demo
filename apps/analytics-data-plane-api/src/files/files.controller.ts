import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { ApiOAuth2, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import {
  CSVW,
  FileMetadataDto,
  FileUpdateDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  DisableOAuthGuard,
  DisableRolesGuard,
  Roles,
  validationPipe
} from "@tsg-dsp/common-api";
import { DatasetSchema } from "@tsg-dsp/common-dsp";
import { DatasetDto } from "@tsg-dsp/common-dsp/dist/model/dsp/catalog/catalog.dto.js";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { FilesService } from "./files.service.js";

@Controller("files")
@ApiOAuth2(["controlplane_dataplane"])
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
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB - TODO: Configurable
      }
    })
  )
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    await this.filesService.uploadFiles(files);
    setImmediate(() => {
      this.filesService.createMetadata(files);
    });
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

  @Get(":id")
  @ApiOperation({
    summary: "Get file",
    description: "Get the file by ID."
  })
  @ApiForbiddenResponseDefault()
  @ApiOkResponse({
    content: {
      "application/octet-stream": {
        schema: {
          type: "string",
          format: "binary"
        }
      }
    }
  })
  @HttpCode(HttpStatus.OK)
  @DisableOAuthGuard()
  @DisableRolesGuard()
  async getFile(
    @Param("id") id: string,
    @Headers("Authorization") authorizationHeader?: string
  ): Promise<StreamableFile> {
    return await this.filesService.getFile(id, authorizationHeader);
  }

  @Get(":id/preview")
  @ApiOperation({
    summary: "Preview file"
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async previewFile(
    @Param("id") id: string,
    @Query("previewSize", new ParseIntPipe({ optional: true }))
    previewSize?: number
  ): Promise<StreamableFile> {
    return await this.filesService.previewFile(id, previewSize);
  }

  @Post(":id")
  @ApiOperation({
    summary: "Update file metadata",
    description: "Update the file metadata by ID."
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async updateFileMetadata(
    @Param("id") id: string,
    @Body(validationPipe) fileUpdateDto: FileUpdateDto
  ) {
    await this.filesService.updateFileMetadata(id, fileUpdateDto);
  }

  @Post(":id/upload")
  @ApiOperation({
    summary: "Upload updated file",
    description: "Upload updated file and (re)create metadata."
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB - TODO: Configurable
      }
    })
  )
  async updateFile(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    await this.filesService.updateFile(id, file);
    setImmediate(() => {
      this.filesService.createMetadata([file]);
    });
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete file",
    description: "Delete the file by ID."
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFile(@Param("id") id: string): Promise<void> {
    return await this.filesService.removeFile(id);
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

  @Get(":id/dataset")
  @ApiOperation({
    summary: "Get dataset",
    description: "Get the dataset of a file."
  })
  @ApiForbiddenResponseDefault()
  @ApiOkResponse({ type: DatasetSchema })
  @HttpCode(HttpStatus.OK)
  async getDataset(@Param("id") id: string): Promise<DatasetDto> {
    return await this.filesService.getDataset(id);
  }
}
