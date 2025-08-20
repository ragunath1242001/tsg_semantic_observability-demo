import { HttpStatus, Injectable, Logger, StreamableFile } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { CSVW } from "@tsg-dsp/analytics-data-plane-dtos";
import { Dataset, Distribution, Offer, Permission } from "@tsg-dsp/common-dsp";
import { randomBytes } from "crypto";
import { parse } from "csv-parse";
import fs, { createReadStream } from "fs";
import * as fsPromises from "fs/promises";
import { finished } from "stream/promises";
import { Repository } from "typeorm";

import { FilesConfig, RootConfig } from "../config.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { DataPlaneError } from "../utils/errors/error.js";
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
  private readonly accessTokens = new Map<string, string>();

  async getAllFileMetadata(): Promise<FileMetadataDao[]> {
    return this.fileRepository.find({});
  }

  async getFileMetadata(identifier: string): Promise<FileMetadataDao> {
    const file = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    return file;
  }

  async getFileByDatasetId(datasetId: string): Promise<FileMetadataDao | null> {
    return this.fileRepository.findOneBy({
      datasetId: datasetId
    });
  }

  async getFile(
    identifier: string,
    authorizationHeader?: string
  ): Promise<StreamableFile> {
    const file = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (!authorizationHeader) {
      throw new DataPlaneError(
        "Authorization header is required",
        HttpStatus.UNAUTHORIZED
      );
    }
    const accessToken = authorizationHeader.split(" ")[1];
    if (!accessToken) {
      throw new DataPlaneError(
        "Access token is required",
        HttpStatus.UNAUTHORIZED
      );
    }
    const tokenIdentifier = this.accessTokens.get(accessToken);
    if (!tokenIdentifier || tokenIdentifier !== file.identifier) {
      throw new DataPlaneError("Invalid access token", HttpStatus.UNAUTHORIZED);
    }
    if (!file.presentInLastCheck) {
      throw new DataPlaneError(
        "File not present in last check",
        HttpStatus.NOT_FOUND
      );
    }
    const filePath = this.filesConfig.path + "/" + file.fileName;
    if (!fs.existsSync(filePath)) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  async createAccessToken(identifier: string): Promise<string> {
    const file = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const accessToken = randomBytes(16).toString("hex");
    this.accessTokens.set(accessToken, identifier);
    return accessToken;
  }

  async processFile(file: Express.Multer.File): Promise<any[]> {
    const records: any[] = [];
    const parser = fs
      .createReadStream(this.filesConfig.path + "/" + file.filename)
      .pipe(parse({ delimiter: ",", to_line: 10 }));
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
    await Promise.all(
      files.map(async (file: Express.Multer.File) => {
        const dbentry = await this.fileRepository.findOneBy({
          fileName: file.filename
        });
        if (!dbentry) {
          throw new DataPlaneError(
            "File not found in database",
            HttpStatus.NOT_FOUND
          );
        }
        const conformsTo: string[] = [];
        if (file.mimetype === "text/csv") {
          try {
            const csvwUrl = await this.createCSVW(file, dbentry);
            conformsTo.push(csvwUrl);
          } catch (error) {
            this.logger.debug(
              `Error creating CSVW, probably not a CSV file: ${file.filename} -> ${error instanceof Error ? error.message : error}`
            );
          }
        }
        const catalog = await this.dataplaneService.getControlPlaneCatalog();
        const datasetId =
          dbentry.datasetId ?? `urn:uuid:${crypto.randomUUID()}`;
        const datasetDto = new Dataset({
          id: datasetId,
          distribution: [
            new Distribution({
              byteSize: `${file.size}`,
              conformsTo: conformsTo,
              title: file.originalname,
              issued: new Date().toISOString(),
              format: "tsg:analytics",
              mediaType: file.mimetype,
              description: [`Data file ${file.originalname}`]
            })
          ],
          title: file.originalname,
          identifier: dbentry.identifier,
          hasPolicy: [
            new Offer({
              assigner: catalog.publisher as string,
              permission: [
                new Permission({
                  action: "odrl:use"
                })
              ]
            })
          ]
        }).serialize();
        if (dbentry.datasetId) {
          await this.dataplaneService.updateDataset(
            dbentry.datasetId,
            datasetDto
          );
        } else {
          await this.dataplaneService.addDataset(datasetDto);
          await this.fileRepository.update(dbentry.identifier, {
            datasetId: datasetId
          });
        }
      })
    );
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
        originalFileName: file.originalname,
        mediaType: file.mimetype,
        presentInLastCheck: true,
        csvw: undefined,
        datasetId: undefined
      });
    });
    await this.fileRepository.insert(fileEntries);
  }

  async removeFile(identifier: string) {
    const dbentry = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!dbentry) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (dbentry.datasetId) {
      this.logger.log(`Deleting dataset for file: ${identifier}`);
      await this.dataplaneService.deleteDataset(dbentry.datasetId);
    }
    const filePath = this.filesConfig.path + "/" + dbentry.fileName;
    if (fs.existsSync(filePath)) {
      this.logger.log(`Deleting file: ${filePath}`);
      fs.rmSync(filePath);
    }

    await this.fileRepository.remove(dbentry);
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
