import {
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  StreamableFile
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CSVW,
  FileUpdateDto,
  MetadataStatus
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  CatalogClientService,
  DataPlaneError
} from "@tsg-dsp/common-data-plane-api";
import {
  DataService,
  Dataset,
  DatasetDto,
  defaultContext,
  Distribution,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";
import { randomBytes } from "crypto";
import { parse } from "csv-parse";
import fs, { createReadStream } from "fs";
import * as fsPromises from "fs/promises";
import path from "path";
import { finished } from "stream/promises";
import { Repository } from "typeorm";

import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { FilesConfig, RootConfig } from "../config.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { mergeFileDatasetUpdate } from "../utils/dataset-file-merge.js";
import { FileMetadataDao } from "./filesMetadata.dao.js";
import { MetadataGeneratorService } from "./metadata-generator.service.js";
import {
  ColumnMetadataEnhancement,
  CombinedMetadataResult
} from "./metadata-tools/metadata-types.js";

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileMetadataDao)
    private readonly fileRepository: Repository<FileMetadataDao>,
    private readonly filesConfig: FilesConfig,
    private readonly rootConfig: RootConfig,
    private readonly catalog: CatalogClientService,
    private readonly metadataGenerator: MetadataGeneratorService,
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

  async getFileMetadata(id: string): Promise<FileMetadataDao> {
    const file = await this.fileRepository.findOneBy({
      id: id
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

  private resolveFilePath(fileName: string): string {
    const basePath = path.resolve(this.filesConfig.path);
    const resolved = path.resolve(basePath, fileName);
    if (!resolved.startsWith(basePath + path.sep) && resolved !== basePath) {
      throw new DataPlaneError("Invalid file path", HttpStatus.BAD_REQUEST);
    }
    return resolved;
  }

  async getFile(
    id: string,
    authorizationHeader?: string
  ): Promise<StreamableFile> {
    const file = await this.fileRepository.findOneBy({
      id: id
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
    if (!tokenIdentifier || tokenIdentifier !== file.id) {
      throw new DataPlaneError("Invalid access token", HttpStatus.UNAUTHORIZED);
    }
    if (!file.presentInLastCheck) {
      throw new DataPlaneError(
        "File not present in last check",
        HttpStatus.NOT_FOUND
      );
    }
    const filePath = this.resolveFilePath(file.fileName);
    if (!fs.existsSync(filePath)) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream);
  }

  async previewFile(id: string, previewSize?: number): Promise<StreamableFile> {
    const file = await this.fileRepository.findOneBy({
      id: id
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
    const filePath = this.resolveFilePath(file.fileName);
    if (!fs.existsSync(filePath)) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const fileStream = createReadStream(filePath, { end: previewSize });
    return new StreamableFile(fileStream);
  }

  async createAccessToken(id: string): Promise<string> {
    const file = await this.fileRepository.findOneBy({
      id: id
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const accessToken = randomBytes(16).toString("hex");
    this.accessTokens.set(accessToken, id);
    return accessToken;
  }

  async processFile(
    file: Express.Multer.File,
    maxLines?: number
  ): Promise<string[][]> {
    const records: string[][] = [];
    const parseOptions: { delimiter: string; to_line?: number } = {
      delimiter: ","
    };
    if (maxLines !== undefined) {
      parseOptions.to_line = maxLines;
    }
    const parser = fs
      .createReadStream(this.resolveFilePath(file.filename))
      .pipe(parse(parseOptions));
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
    dbentry: FileMetadataDao,
    columnEnhancements?: Array<ColumnMetadataEnhancement>
  ): Promise<string> {
    const csv = await this.processFile(file, 10);
    // Build columns structure with optional enhancements
    const columns: Array<ColumnMetadataEnhancement | { name: string }> =
      csv[0].map((column: string) => {
        const enhancement = columnEnhancements?.find(
          (e) => e["csvw:name"] === column
        );
        if (enhancement) {
          return enhancement;
        } else {
          return {
            name: column
          };
        }
      });
    const csvw = {
      "@context": ["http://www.w3.org/ns/csvw", ...defaultContext()],
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
    } as CSVW;
    dbentry.csvw = csvw;
    await this.fileRepository.save(dbentry);
    return `${this.rootConfig.server.publicAddress}/files/${dbentry.id}/csvw`;
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

        // Update status to generating
        dbentry.metadataStatus = MetadataStatus.GENERATING;
        dbentry.metadataError = undefined;
        await this.fileRepository.save(dbentry);

        const conformsTo: string[] = [];

        // Metadata container
        let metadata: CombinedMetadataResult | null = null;

        try {
          // For CSV files, generate metadata (deterministic + optional LLM enhancement)
          if (file.mimetype === "text/csv") {
            // Read entire CSV for deterministic facts
            const csvFull = await this.processFile(file);
            const headers = csvFull[0] as string[];
            const allRows = csvFull.slice(1) as string[][];

            // Generate metadata: deterministic facts + LLM for descriptions/keywords
            const useLLM = this.rootConfig.llm?.enabled ?? false;

            // For LLM analysis, only use a subset of rows (first 20) to avoid token limits
            const llmRows = useLLM ? allRows.slice(0, 20) : allRows;

            metadata = await this.metadataGenerator.generateMetadata(
              headers,
              allRows, // Pass all rows for deterministic facts
              file.originalname,
              useLLM,
              llmRows // Pass subset for LLM
            );

            this.logger.log(
              `Generated metadata for ${file.originalname}: ${allRows.length} rows, ${headers.length} columns`
            );

            if (
              headers.length >= this.rootConfig.files.maxInlineMetadataColumns
            ) {
              try {
                const csvwUrl = await this.createCSVW(
                  file,
                  dbentry,
                  metadata?.columns
                );
                conformsTo.push(csvwUrl);
              } catch (error) {
                this.logger.debug(
                  `Error creating CSVW: ${file.filename} -> ${error instanceof Error ? error.message : error}`
                );
              }
            } else {
              dbentry.inlineCsvw = true;
              await this.fileRepository.update(dbentry.id, {
                inlineCsvw: true
              });
            }
          }

          const catalog = await this.catalog.getOwnCatalog();
          const datasetId = dbentry.datasetId ?? `urn:uuid:${dbentry.id}`;

          // Use generated metadata if available, otherwise use defaults
          const title = metadata?.dataset?.["dct:title"] || file.originalname;
          const description = metadata?.dataset?.["dct:description"]
            ? [metadata.dataset["dct:description"]]
            : [`Data file ${file.originalname}`];

          this.logger.debug(
            `Creating dataset: title="${title}", keywords=${JSON.stringify(metadata?.dataset?.["dcat:keyword"])}, temporal="${metadata?.dataset?.["dct:temporal"]}"`
          );
          // Get all properties of Dataset to know which to filter
          const datasetProperties = Object.getOwnPropertyNames(new Dataset({}));
          const datasetDto = new Dataset({
            id: datasetId,
            extraProps: metadata?.dataset
              ? Object.fromEntries(
                  Object.entries(metadata.dataset).filter(
                    ([key, value]) =>
                      key.includes(":") &&
                      !datasetProperties.includes(key.split(":")[1]) &&
                      value !== undefined &&
                      value !== null
                  )
                )
              : undefined,
            distribution: [
              new Distribution({
                byteSize: `${file.size}`,
                conformsTo: conformsTo,
                title: title,
                issued: new Date().toISOString(),
                accessService: new DataService({
                  endpointDescription: "Dataspace Protocol API",
                  endpointURL: `${this.rootConfig.controlPlane?.controlEndpoint}`
                }),
                format: "tsg:analytics",
                mediaType: file.mimetype,
                description: description
              })
            ],
            title: title,
            description: description,
            keyword: metadata?.dataset?.["dcat:keyword"],
            theme: metadata?.dataset?.["dcat:theme"],
            temporal: metadata?.dataset?.["dct:temporal"],
            spatial: metadata?.dataset?.["dct:spatial"],
            license: metadata?.dataset?.["dct:license"],
            hasCodingSystem:
              metadata?.dataset?.["healthdcatap:hasCodingSystem"],
            numberOfRecords:
              metadata?.dataset?.["healthdcatap:numberOfRecords"],
            numberOfUniqueIndividuals:
              metadata?.dataset?.["healthdcatap:numberOfUniqueIndividuals"],
            healthTheme: metadata?.dataset?.["healthdcatap:healthTheme"],

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

          // Log the serialized dataset to verify metadata is included
          this.logger.debug(
            `Serialized dataset DTO: ${JSON.stringify(datasetDto, null, 2)}`
          );

          if (dbentry.datasetId) {
            if (this.isClientMode) {
              // Client mode: notify server side of bridge
              this.bridgeWs.emit("client.datasets.upsert", {
                dataset: datasetDto
              });
            } else {
              await this.dataplaneService?.updateDataset(
                dbentry.datasetId,
                datasetDto
              );
            }
            this.logger.log(
              `Updated dataset ${dbentry.datasetId} for file ${file.originalname}`
            );
          } else {
            if (this.isClientMode) {
              // Client mode: notify server side of bridge
              this.bridgeWs.emit("client.datasets.upsert", {
                dataset: datasetDto
              });
            } else {
              await this.dataplaneService?.addDataset(datasetDto);
            }
            await this.fileRepository.update(dbentry.id, {
              datasetId: datasetId
            });
            this.logger.log(
              `Added new dataset ${datasetId} for file ${file.originalname}`
            );
          }

          // Mark metadata generation as complete
          await this.fileRepository.update(dbentry.id, {
            metadataStatus: MetadataStatus.COMPLETE
          });
        } catch (error) {
          // Mark metadata generation as failed
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Metadata generation failed for ${file.originalname}: ${errorMessage}`
          );
          await this.fileRepository.update(dbentry.id, {
            metadataStatus: MetadataStatus.ERROR,
            metadataError: errorMessage
          });
        }
      })
    );
  }

  async getCSVW(id: string): Promise<CSVW> {
    const file = await this.fileRepository.findOneBy({
      id: id
    });
    if (!file) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    if (!file.csvw) {
      throw new DataPlaneError("CSVW not found", HttpStatus.NOT_FOUND);
    }
    return file.csvw;
  }

  async getDataset(id: string): Promise<DatasetDto> {
    const file = await this.fileRepository.findOneBy({
      id: id
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
        fileSizeInBytes: file.size,
        fileName: file.filename,
        originalFileName: file.originalname,
        mediaType: file.mimetype,
        presentInLastCheck: true,
        csvw: undefined,
        datasetId: undefined,
        metadataStatus: MetadataStatus.PENDING
      });
    });
    await this.fileRepository.insert(fileEntries);
  }

  async updateFileMetadata(id: string, fileUpdateDto: FileUpdateDto) {
    const dbentry = await this.fileRepository.findOneBy({
      id: id
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
        `${this.rootConfig.server.publicAddress}/files/${dbentry.id}/csvw`
      );
    }

    if (this.isClientMode) {
      const clientDatasetId = datasetId ?? `urn:uuid:${dbentry.id}`;

      // Persist derived dataset id so later operations (e.g., delete) can reference it.
      if (!dbentry.datasetId) {
        await this.fileRepository.update(dbentry.id, {
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

  async updateFile(id: string, file: Express.Multer.File) {
    const dbentry = await this.fileRepository.findOneBy({
      id: id
    });
    if (!dbentry) {
      throw new DataPlaneError("File not found", HttpStatus.NOT_FOUND);
    }
    const oldFilePath = this.resolveFilePath(dbentry.fileName);
    if (fs.existsSync(oldFilePath)) {
      fs.rmSync(oldFilePath);
    }
    const newFilePath = this.resolveFilePath(file.filename);
    fs.renameSync(file.path, newFilePath);
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
        `${this.rootConfig.server.publicAddress}/files/${dbentry.id}/csvw`
      );
    }

    if (this.isClientMode) {
      // Client mode: publish dataset changes to the server side of the bridge.
      const clientDatasetId = datasetId ?? `urn:uuid:${dbentry.id}`;
      if (!dbentry.datasetId) {
        await this.fileRepository.update(dbentry.id, {
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
      const publishedDatasetId = datasetId ?? `urn:uuid:${dbentry.id}`;
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
        await this.fileRepository.update(dbentry.id, {
          datasetId: publishedDatasetId
        });
      }
    }
  }

  async removeFile(id: string) {
    const dbentry = await this.fileRepository.findOneBy({
      id: id
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
      this.logger.log(`Deleting dataset for file: ${id}`);
      await this.dataplaneService.deleteDataset(dbentry.datasetId);
    }
    const filePath = this.resolveFilePath(dbentry.fileName);
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
          missingFiles.map((missingFile) => missingFile.id),
          {
            presentInLastCheck: false
          }
        );
      }
      const restoredFiles = filesToFind.filter(
        (file) => !file.presentInLastCheck && files.includes(file.fileName)
      );
      if (restoredFiles.length > 0) {
        await this.fileRepository.update(
          restoredFiles.map((file) => file.id),
          {
            presentInLastCheck: true
          }
        );
        this.logger.log(
          `Restored ${restoredFiles.length} file(s) that reappeared on disk`
        );
      }
    } catch (err) {
      throw new Error(`Error reading directory: ${err}`, { cause: err });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncMetadata() {
    if (this.filesConfig.recreateFileMetadata) {
      const files = await fsPromises.readdir(this.filesConfig.path);
      const dbEntries: { fileName: string }[] = await this.fileRepository.find({
        select: ["fileName"]
      });
      for (const file of files) {
        if (!dbEntries.find((dbEntry) => dbEntry.fileName === file)) {
          // eslint-disable-next-line no-await-in-loop
          const stat = await fsPromises.stat(this.resolveFilePath(file));
          if (!stat.isFile()) {
            continue;
          }
          // Only if file is older than 1 minute to avoid conflicts with ongoing uploads
          if (stat.birthtimeMs > Date.now() - 60_000) {
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          await this.recreateMetadata(file, stat);
          break;
        }
      }
    }
  }

  private async recreateMetadata(file: string, stat: fs.Stats) {
    let mimetype = "application/octet-stream";
    switch (file.split(".").slice(-1)[0]) {
      case "csv":
        mimetype = "text/csv";
        break;
      case "json":
        mimetype = "application/json";
        break;
      case "xlsx":
        mimetype =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "h5":
      case "hdf5":
        mimetype = "application/x-hdf";
        break;
    }
    let originalname = file;
    // Check if file starts with a unix epoch in ms added by Multer
    if (file.match(/^\d{13}-/)) {
      originalname = file.slice(14);
    }
    this.logger.log(
      `Found file without metadata, uploading: ${file} (${stat.size} bytes)`
    );
    const catalog = await this.catalog.getOwnCatalog();
    const matchingDataset = catalog.dataset?.find((d) =>
      d.distribution?.find(
        (dist) =>
          dist.byteSize === `${stat.size}` && dist.title === originalname
      )
    );
    const multerMock: Express.Multer.File = {
      fieldname: "file",
      originalname,
      mimetype,
      size: stat.size,
      filename: file
    } as Express.Multer.File;

    await this.uploadFiles([multerMock]);

    if (matchingDataset) {
      this.logger.log(
        `Found matching dataset for file ${file}, linking metadata: ${matchingDataset["@id"]}`
      );
      await this.fileRepository.update(
        { fileName: file },
        { datasetId: matchingDataset["@id"] }
      );
    }
    setImmediate(() => {
      this.createMetadata([multerMock]).catch((err) => {
        this.logger.error(
          `Failed to create metadata for ${file}: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    });
  }
}
