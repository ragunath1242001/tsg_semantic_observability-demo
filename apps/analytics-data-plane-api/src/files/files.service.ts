import {
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  StreamableFile
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { CSVW, FileUpdateDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
import {
  DataService,
  Dataset,
  DatasetDto,
  Distribution,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";
import { randomBytes } from "crypto";
import { parse } from "csv-parse";
import fs, { createReadStream } from "fs";
import * as fsPromises from "fs/promises";
import { finished } from "stream/promises";
import { Repository } from "typeorm";

import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { FilesConfig, RootConfig } from "../config.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { mergeFileDatasetUpdate } from "../utils/dataset-file-merge.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { FileMetadataDao } from "./filesMetadata.dao.js";

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileMetadataDao)
    private readonly fileRepository: Repository<FileMetadataDao>,
    private readonly filesConfig: FilesConfig,
    private readonly rootConfig: RootConfig,
    private readonly catalog: CatalogClientService,
    private readonly bridgeWs: BridgeWsClientService,
    @Optional()
    private readonly dataplaneService?: DataPlaneService
  ) {}

  private readonly logger = new Logger(this.constructor.name);
  private readonly accessTokens = new Map<string, string>();

  private buildDatasetDto(params: {
    datasetId: string;
    title?: string;
    fileSizeInBytes?: number;
    mediaType?: string;
    conformsTo?: string[];
    includePolicy?: boolean;
    policyAssigner?: string;
  }): DatasetDto {
    const {
      datasetId,
      title,
      fileSizeInBytes,
      mediaType,
      conformsTo,
      includePolicy,
      policyAssigner
    } = params;

    const datasetDto = new Dataset({
      id: datasetId,
      distribution: [
        new Distribution({
          byteSize:
            fileSizeInBytes !== undefined ? `${fileSizeInBytes}` : undefined,
          conformsTo,
          title,
          issued: new Date().toISOString(),
          accessService: new DataService({
            endpointDescription: "Dataspace Protocol API",
            endpointURL: this.rootConfig.controlPlane?.controlEndpoint
          }),
          format: "tsg:analytics",
          mediaType,
          description: title ? [`Data file ${title}`] : undefined
        })
      ],
      title,
      hasPolicy:
        includePolicy && policyAssigner
          ? [
              new Offer({
                assigner: policyAssigner,
                permission: [
                  new Permission({
                    action: "odrl:use"
                  })
                ]
              })
            ]
          : undefined
    }).serialize();

    return datasetDto as unknown as DatasetDto;
  }

  private get isClientMode(): boolean {
    return this.rootConfig.split.mode === "client";
  }

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

  async previewFile(
    identifier: string,
    previewSize?: number
  ): Promise<StreamableFile> {
    const file = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
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
    const fileStream = createReadStream(filePath, { end: previewSize });
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

  async processFile(file: Express.Multer.File): Promise<string[][]> {
    const records: string[][] = [];
    const parser = fs
      .createReadStream(this.filesConfig.path + "/" + file.filename)
      .pipe(parse({ delimiter: ",", to_line: 10 }));
    parser.on("readable", () => {
      let record: string[] | null;
      while ((record = parser.read() as string[] | null) !== null) {
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
    const columns: { name: string }[] = csv[0].map((column: string) => {
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
        const datasetId = dbentry.datasetId ?? `urn:uuid:${dbentry.identifier}`;

        const datasetDtoNoPolicy = this.buildDatasetDto({
          datasetId,
          title: file.originalname,
          fileSizeInBytes: file.size,
          mediaType: file.mimetype,
          conformsTo
        });

        // In client mode we only maintain local metadata; dataset publication happens server-side.
        if (this.isClientMode || !this.dataplaneService) {
          if (!dbentry.datasetId) {
            await this.fileRepository.update(dbentry.identifier, {
              datasetId
            });
          }

          if (this.isClientMode) {
            // In split.client mode, the server side of the bridge does not run a FilesService.
            // Exchange dataset updates instead so the server can sync/publish datasets.
            this.bridgeWs.emit("client.datasets.upsert", {
              dataset: datasetDtoNoPolicy
            });
          }
          return;
        }

        const catalog = await this.catalog.getOwnCatalog();
        const datasetDto = this.buildDatasetDto({
          datasetId,
          title: file.originalname,
          fileSizeInBytes: file.size,
          mediaType: file.mimetype,
          conformsTo,
          includePolicy: true,
          policyAssigner: catalog.publisher as string
        });

        let existingDataset: DatasetDto | undefined;
        try {
          existingDataset = await this.dataplaneService.getDataset(datasetId);
        } catch (_err) {
          // If it doesn't exist yet, we'll create it below.
        }

        const merged = mergeFileDatasetUpdate(existingDataset, datasetDto, {
          policyAssigner: catalog.publisher as string
        });

        if (existingDataset) {
          await this.dataplaneService.updateDataset(datasetId, merged);
        } else {
          await this.dataplaneService.addDataset(merged);
        }

        if (!dbentry.datasetId) {
          await this.fileRepository.update(dbentry.identifier, { datasetId });
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

  async getDataset(identifier: string): Promise<DatasetDto> {
    const file = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (!file.datasetId) {
      throw new DataPlaneError("Dataset not found", HttpStatus.NOT_FOUND);
    }
    if (!this.dataplaneService) {
      throw new DataPlaneError(
        "Dataset access is not available in this runtime mode",
        HttpStatus.NOT_IMPLEMENTED
      );
    }
    return await this.dataplaneService.getDataset(file.datasetId);
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

  async updateFileMetadata(identifier: string, fileUpdateDto: FileUpdateDto) {
    const dbentry = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!dbentry) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (fileUpdateDto.originalFileName) {
      dbentry.originalFileName = fileUpdateDto.originalFileName;
    }
    if (fileUpdateDto.mediaType) {
      dbentry.mediaType = fileUpdateDto.mediaType;
    }
    if (fileUpdateDto.csvw) {
      dbentry.csvw = fileUpdateDto.csvw;
    }
    await this.fileRepository.save(dbentry);

    const datasetId = dbentry.datasetId;
    const conformsTo: string[] = [];
    if (dbentry.csvw) {
      conformsTo.push(
        `${this.rootConfig.server.publicAddress}/files/${dbentry.identifier}/csvw`
      );
    }

    if (this.isClientMode) {
      const clientDatasetId = datasetId ?? `urn:uuid:${dbentry.identifier}`;

      // Persist derived dataset id so later operations (e.g., delete) can reference it.
      if (!dbentry.datasetId) {
        await this.fileRepository.update(dbentry.identifier, {
          datasetId: clientDatasetId
        });
      }
      const datasetDto = this.buildDatasetDto({
        datasetId: clientDatasetId,
        title: dbentry.originalFileName,
        fileSizeInBytes: dbentry.fileSizeInBytes,
        mediaType: dbentry.mediaType,
        conformsTo
      });

      this.bridgeWs.emit("client.datasets.upsert", {
        dataset: datasetDto
      });
      return;
    }

    // Standalone/server: update the published dataset if it exists.
    if (datasetId && this.dataplaneService) {
      const catalog = await this.catalog.getOwnCatalog();
      const datasetDto = this.buildDatasetDto({
        datasetId,
        title: dbentry.originalFileName,
        fileSizeInBytes: dbentry.fileSizeInBytes,
        mediaType: dbentry.mediaType,
        conformsTo,
        includePolicy: true,
        policyAssigner: catalog.publisher as string
      });

      let existingDataset: DatasetDto | undefined;
      try {
        existingDataset = await this.dataplaneService.getDataset(datasetId);
      } catch (_err) {
        // If missing, we'll create it.
      }

      const merged = mergeFileDatasetUpdate(existingDataset, datasetDto, {
        policyAssigner: catalog.publisher as string
      });

      if (existingDataset) {
        await this.dataplaneService.updateDataset(datasetId, merged);
      } else {
        await this.dataplaneService.addDataset(merged);
      }
    }
  }

  async updateFile(identifier: string, file: Express.Multer.File) {
    const dbentry = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!dbentry) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const filePath = this.filesConfig.path + "/" + dbentry.fileName;
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
    }
    fs.renameSync(file.path, filePath);
    dbentry.fileSizeInBytes = file.size;
    dbentry.fileName = file.filename;
    dbentry.originalFileName = file.originalname;
    dbentry.mediaType = file.mimetype;
    dbentry.presentInLastCheck = true;
    await this.fileRepository.save(dbentry);

    const datasetId = dbentry.datasetId;
    const conformsTo: string[] = [];
    if (dbentry.csvw) {
      conformsTo.push(
        `${this.rootConfig.server.publicAddress}/files/${dbentry.identifier}/csvw`
      );
    }

    if (this.isClientMode) {
      // Client mode: publish dataset changes to the server side of the bridge.
      const clientDatasetId = datasetId ?? `urn:uuid:${dbentry.identifier}`;
      if (!dbentry.datasetId) {
        await this.fileRepository.update(dbentry.identifier, {
          datasetId: clientDatasetId
        });
      }

      const datasetDto = this.buildDatasetDto({
        datasetId: clientDatasetId,
        title: dbentry.originalFileName,
        fileSizeInBytes: dbentry.fileSizeInBytes,
        mediaType: dbentry.mediaType,
        conformsTo
      });
      this.bridgeWs.emit("client.datasets.upsert", {
        dataset: datasetDto
      });
      return;
    }

    // Standalone/server: ensure the dataset is updated (not just file DB state).
    if (this.dataplaneService) {
      const publishedDatasetId = datasetId ?? `urn:uuid:${dbentry.identifier}`;
      const catalog = await this.catalog.getOwnCatalog();
      const datasetDto = this.buildDatasetDto({
        datasetId: publishedDatasetId,
        title: dbentry.originalFileName,
        fileSizeInBytes: dbentry.fileSizeInBytes,
        mediaType: dbentry.mediaType,
        conformsTo,
        includePolicy: true,
        policyAssigner: catalog.publisher as string
      });

      let existingDataset: DatasetDto | undefined;
      try {
        existingDataset =
          await this.dataplaneService.getDataset(publishedDatasetId);
      } catch (_err) {
        // If missing, we'll create it.
      }

      const merged = mergeFileDatasetUpdate(existingDataset, datasetDto, {
        policyAssigner: catalog.publisher as string
      });

      if (existingDataset) {
        await this.dataplaneService.updateDataset(publishedDatasetId, merged);
      } else {
        await this.dataplaneService.addDataset(merged);
      }

      if (!dbentry.datasetId) {
        await this.fileRepository.update(dbentry.identifier, {
          datasetId: publishedDatasetId
        });
      }
    }
  }

  async removeFile(identifier: string) {
    const dbentry = await this.fileRepository.findOneBy({
      identifier: identifier
    });
    if (!dbentry) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (this.isClientMode) {
      // Propagate dataset removal to the server-side dataplane (server mode has no FilesService).
      if (dbentry.datasetId) {
        this.bridgeWs.emit("client.datasets.delete", {
          datasetId: dbentry.datasetId
        });
      }
    } else if (dbentry.datasetId && this.dataplaneService) {
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
