import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Dataset,
  DatasetDto,
  Distribution,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";
import { parse } from "csv-parse";
import fs from "fs";
import * as fsPromises from "fs/promises";
import { finished } from "stream/promises";
import { Repository } from "typeorm";

import { FilesConfig, RootConfig } from "../config.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { CSVW } from "./files.dto.js";
import { FileMetadataDao } from "./filesMetadata.dao.js";

@Injectable()
export class FilesService {
  constructor(
    private readonly dataplaneService: DataPlaneService,
    @InjectRepository(FileMetadataDao)
    private readonly fileRepository: Repository<FileMetadataDao>,
    private readonly filesConfig: FilesConfig,
    private readonly rootConfig: RootConfig
  ) {}

  private readonly logger = new Logger(this.constructor.name);

  async getAllFileMetadata(): Promise<FileMetadataDao[]> {
    return this.fileRepository.find({});
  }

  async processFile(file: Express.Multer.File): Promise<any[]> {
    const records: any[] = [];
    const parser = fs
      .createReadStream(this.filesConfig.path + "/" + file.filename)
      .pipe(parse({ delimiter: "," }));
    parser.on("readable", () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });
    await finished(parser);
    return records;
  }

  async createCSVW(
    file: Express.Multer.File,
    dbentry: FileMetadataDao
  ): Promise<string> {
    const csv = await this.processFile(file);
    const columns: { name: "string" }[] = csv[0].map((column: string) => {
      return { name: column };
    });
    const csvw = {
      "@context": ["http://www.w3.org/ns/csvw"],
      tables: [
        {
          url: "",
          tableSchema: {
            columns: columns
          },
          dialect: {
            header: true
          }
        }
      ]
    };
    dbentry.csvw = csvw;
    await this.fileRepository.save(dbentry);
    return `${this.rootConfig.server.publicAddress}/files/${dbentry.identifier}/csvw`;
  }

  async createMetadata(files: Array<Express.Multer.File>) {
    const datasets: DatasetDto[] = [];
    await Promise.all(
      files.map(async (file: Express.Multer.File) => {
        const dbentry = await this.fileRepository.findOneBy({
          fileName: file.filename
        });
        if (!dbentry) {
          throw Error("File not found in database");
        }
        const csvwurl = await this.createCSVW(file, dbentry);
        const catalog = await this.dataplaneService.getControlPlaneCatalog();

        datasets.push(
          new Dataset({
            distribution: [
              new Distribution({
                byteSize: `${file.size}`,
                conformsTo: [csvwurl],
                title: file.filename,
                issued: new Date().toISOString(),
                format: "text/csv",
                mediaType: "text/csv",
                description: [`CSV file ${file.filename}`]
              })
            ],
            title: file.filename,
            identifier: dbentry.identifier,
            hasPolicy: [
              new Offer({
                assigner: catalog["dct:publisher"] as string,
                permission: [
                  new Permission({
                    action: "odrl:use"
                  })
                ]
              })
            ]
          }).serialize()
        );
      })
    );
    await this.dataplaneService.updateDatasets(datasets);
  }

  async getCSVW(identifier: string): Promise<CSVW> {
    const file = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (!file.csvw) {
      throw new DataPlaneError("CSVW not found", HttpStatus.NOT_FOUND);
    }
    return file.csvw;
  }

  async uploadFiles(files: Array<Express.Multer.File>) {
    const fileEntries = files.map((file: Express.Multer.File) => {
      return this.fileRepository.create({
        identifier: crypto.randomUUID(),
        fileSizeInBytes: file.size,
        fileName: file.filename,
        presentInLastCheck: true,
        csvw: undefined
      });
    });
    await this.fileRepository.insert(fileEntries);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncFiles() {
    const filesToFind = await this.getAllFileMetadata();
    try {
      const files = await fsPromises.readdir(this.filesConfig.path);
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
