import { Injectable, Logger } from "@nestjs/common";
import { FileMetadataDao } from "./filesMetadata.dao";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import fs from "fs/promises";
import { FilesConfig } from "../config";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileMetadataDao)
    private readonly fileRepository: Repository<FileMetadataDao>,
    private readonly filesConfig: FilesConfig
  ) {}

  private readonly logger = new Logger(this.constructor.name);

  async getAllFileMetadata(): Promise<FileMetadataDao[]> {
    return this.fileRepository.find({});
  }

  async uploadFiles(files: Array<Express.Multer.File>) {
    const fileEntries = files.map((file: Express.Multer.File) => {
      return this.fileRepository.create({
        identifier: crypto.randomUUID(),
        fileSizeInBytes: file.size,
        fileName: file.filename,
        presentInLastCheck: true
      });
    });
    await this.fileRepository.insert(fileEntries);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncFiles() {
    const filesToFind = await this.getAllFileMetadata();
    try {
      const files = await fs.readdir(this.filesConfig.path);
      const missingFiles = filesToFind.filter(
        (file) => !files.includes(file.fileName)
      );
      if (missingFiles.length > 0) {
        await this.fileRepository.update(
          missingFiles.map((missingFile) => missingFile.identifier),
          {
            presentInLastCheck: false
          }
        );
      }
    } catch (err) {
      throw Error(`Error reading directory: ${err}`);
    }
  }
}
