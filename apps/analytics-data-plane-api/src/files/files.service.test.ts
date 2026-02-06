import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ControlPlaneConfig,
  createDataPlaneManagementHttpMocks
} from "@tsg-dsp/common-data-plane-api";
import { plainToClass } from "class-transformer";
import fs from "fs/promises";
import { SetupServer, setupServer } from "msw/node";
import path from "path";
import { fileURLToPath } from "url";
import { Mock, vi } from "vitest";

import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { FilesConfig, LLMConfig, RootConfig } from "../config.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { FilesService } from "./files.service.js";
import { FileMetadataDao } from "./filesMetadata.dao.js";
import { MetadataGeneratorService } from "./metadata-generator.service.js";

describe("FilesService", () => {
  let server: SetupServer;
  let filesService: FilesService;
  let dataPlaneServiceMock: {
    getControlPlaneCatalog: Mock;
    updateDatasets: Mock;
    addDataset: Mock;
    updateDataset: Mock;
    deleteDataset: Mock;
  };
  const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
  const __dirname = path.dirname(__filename); // get the name of the directory
  const testUploadDir = path.join(__dirname, "uploads_test"); // Temporary upload directory

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    await fs.mkdir(testUploadDir);
    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        initializationDelay: 1
      },
      logging: {
        debug: true
      },
      files: {
        maxInlineMetadataColumns: 1
      }
    });
    server = setupServer(
      ...createDataPlaneManagementHttpMocks(
        config.controlPlane.managementEndpoint
      )
    );
    server.listen({ onUnhandledRequest: "error" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([FileMetadataDao]),
        TypeOrmModule.forFeature([FileMetadataDao])
      ],
      providers: [
        {
          provide: DataPlaneService,
          useValue: {
            getControlPlaneCatalog: vi.fn(async () => {
              return {
                provider: "hello"
              };
            }),
            updateDatasets: vi.fn(async () => ({})),
            addDataset: vi.fn(async () => ({})),
            updateDataset: vi.fn(async () => ({})),
            deleteDataset: vi.fn(async () => ({}))
          }
        },
        FilesService,
        AuthClientService,
        MetadataGeneratorService,
        CatalogClientService,
        {
          provide: FilesConfig,
          useValue: { path: testUploadDir }
        },
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ControlPlaneConfig,
          useValue: config.controlPlane
        },
        {
          provide: BridgeWsClientService,
          useValue: {
            emit: vi.fn(),
            on: vi.fn()
          }
        },
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: LLMConfig,
          useValue: { enabled: false }
        }
      ]
    }).compile();

    filesService = moduleRef.get(FilesService);
    dataPlaneServiceMock = moduleRef.get(
      DataPlaneService
    ) as unknown as typeof dataPlaneServiceMock;
  });
  afterEach(async () => {
    await filesService["fileRepository"].clear();
  });
  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
    await fs.rm(testUploadDir, { recursive: true, force: true }); // Clean up the test directory
    server.close();
  });

  it("should be defined", () => {
    expect(filesService).toBeDefined();
  });

  describe("getAllFileMetadata", () => {
    it("should return an empty array when no files are uploaded", async () => {
      const result = await filesService.getAllFileMetadata();
      expect(result).toEqual([]);
    });
  });

  describe("uploadFiles", () => {
    it("should create and insert file metadata entries", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.txt",
          originalname: "file1.txt",
          mimetype: "text/plain"
        },
        {
          size: 2000,
          filename: "file2.txt",
          originalname: "file2.txt",
          mimetype: "text/plain"
        }
      ] as Express.Multer.File[];

      await filesService.uploadFiles(mockFiles);
      const savedFiles = await filesService.getAllFileMetadata();

      expect(savedFiles.length).toBe(2);
      expect(savedFiles.map((file) => file.fileName)).toEqual([
        "file1.txt",
        "file2.txt"
      ]);
    });
  });

  describe("syncFiles", () => {
    it("should mark missing files as not present", async () => {
      // Step 1: Upload initial files and verify they are in the database
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.txt",
          originalname: "file1.txt",
          mimetype: "text/plain"
        },
        {
          size: 2000,
          filename: "file2.txt",
          originalname: "file2.txt",
          mimetype: "text/plain"
        }
      ] as Express.Multer.File[];
      await filesService.uploadFiles(mockFiles);

      // Step 2: Create only one file in the file system, simulating a missing file
      await fs.writeFile(
        path.join(testUploadDir, "file1.txt"),
        "dummy content"
      );

      // Step 3: Run the syncFiles method to mark missing files
      await filesService.syncFiles();
      const updatedFiles = await filesService.getAllFileMetadata();

      const file1 = updatedFiles.find((file) => file.fileName === "file1.txt");
      const file2 = updatedFiles.find((file) => file.fileName === "file2.txt");

      expect(file1?.presentInLastCheck).toBe(true); // file1.txt exists in the directory
      expect(file2?.presentInLastCheck).toBe(false); // file2.txt is missing
    });

    it("should handle a non-existing directory gracefully", async () => {
      // Temporarily change the file path to a non-existent directory
      const nonExistentPath = path.join(__dirname, "non_existent_dir");
      filesService["filesConfig"].path = nonExistentPath;

      await expect(filesService.syncFiles()).rejects.toThrow(
        "Error reading directory"
      );

      // Revert the path to the valid test directory
      filesService["filesConfig"].path = testUploadDir;
    });
  });
  describe("processFile", () => {
    it("should process a CSV file and return its records", async () => {
      const mockFile = { filename: "test.csv" } as Express.Multer.File;
      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      await fs.writeFile(
        path.join(testUploadDir, mockFile.filename),
        mockContent
      );
      const records = await filesService.processFile(mockFile);
      expect(records).toEqual([
        ["col1", "col2"],
        ["val1", "val2"],
        ["val3", "val4"]
      ]);
      await fs.rm(path.join(testUploadDir, mockFile.filename));
    });
    it("should process a CSV file and return its first 10 lines when maxLines is specified", async () => {
      const mockFile = { filename: "test.csv" } as Express.Multer.File;
      const mockContent =
        "col1,col2\nval1,val2\nval3,val4\nval5,val6\nval7,val8\nval9,val10\nval11,val12\nval13,val14\nval15,val16\nval17,val18\nval19,val20\nval21,val22";
      await fs.writeFile(
        path.join(testUploadDir, mockFile.filename),
        mockContent
      );
      const records = await filesService.processFile(mockFile, 10);
      expect(records).toEqual([
        ["col1", "col2"],
        ["val1", "val2"],
        ["val3", "val4"],
        ["val5", "val6"],
        ["val7", "val8"],
        ["val9", "val10"],
        ["val11", "val12"],
        ["val13", "val14"],
        ["val15", "val16"],
        ["val17", "val18"]
      ]);
      await fs.rm(path.join(testUploadDir, mockFile.filename));
    });
  });

  describe("createMetadata", () => {
    it("should create metadata for uploaded files", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.csv",
          originalname: "file1.csv",
          mimetype: "text/csv"
        },
        {
          size: 2000,
          filename: "file2.csv",
          originalname: "file2.csv",
          mimetype: "text/csv"
        }
      ] as Express.Multer.File[];

      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      await Promise.all(
        mockFiles.map((mockFile) =>
          fs.writeFile(path.join(testUploadDir, mockFile.filename), mockContent)
        )
      );

      await filesService.uploadFiles(mockFiles);
      await filesService.createMetadata(mockFiles);

      expect(dataPlaneServiceMock.addDataset).toHaveBeenCalledTimes(2);
      for (const call of dataPlaneServiceMock.addDataset.mock.calls) {
        const datasetDto = call[0] as Record<string, unknown>;
        expect(datasetDto.numberOfRecords).toBe(2);
        expect(datasetDto["dqv:completeness"]).toBe("all-variables");
      }

      const savedFiles = await filesService.getAllFileMetadata();
      expect(savedFiles.length).toBe(2);
      expect(savedFiles[0].csvw).toBeDefined();
      expect(savedFiles[1].csvw).toBeDefined();

      expect(
        await filesService.getFileByDatasetId(savedFiles[0].datasetId!)
      ).toEqual(savedFiles[0]);
      expect(
        await filesService.getFileByDatasetId(savedFiles[1].datasetId!)
      ).toEqual(savedFiles[1]);
    });
  });

  describe("getFileMetadata", () => {
    it("should return metadata for a given file identifier", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.csv",
          originalname: "file1.csv",
          mimetype: "text/csv"
        },
        {
          size: 2000,
          filename: "file2.csv",
          originalname: "file2.csv",
          mimetype: "text/csv"
        }
      ] as Express.Multer.File[];

      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      mockFiles.forEach(async (mockFile) => {
        await fs.writeFile(
          path.join(testUploadDir, mockFile.filename),
          mockContent
        );
      });

      await filesService.uploadFiles(mockFiles);
      await filesService.createMetadata(mockFiles);

      const dbEntry = await filesService.getAllFileMetadata();
      const metadata = await filesService.getFileMetadata(dbEntry[0].id);
      expect(metadata).toBeDefined();
      expect(metadata.fileName).toBe(mockFiles[0].filename);
      expect(metadata.originalFileName).toBe(mockFiles[0].originalname);
      expect(metadata.fileSizeInBytes).toBe(mockFiles[0].size);
      expect(metadata.presentInLastCheck).toBe(true);
      expect(metadata.csvw).toBeDefined();
    });
    it("should throw an error if file not found", async () => {
      await expect(
        filesService.getFileMetadata("non-existent-id")
      ).rejects.toThrow("File not found");
    });
  });

  describe("createAccessToken", () => {
    it("should create an access token for a given file identifier", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.csv",
          originalname: "file1.csv",
          mimetype: "text/csv"
        },
        {
          size: 2000,
          filename: "file2.csv",
          originalname: "file2.csv",
          mimetype: "text/csv"
        }
      ] as Express.Multer.File[];
      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      mockFiles.forEach(async (mockFile) => {
        await fs.writeFile(
          path.join(testUploadDir, mockFile.filename),
          mockContent
        );
      });
      await filesService.uploadFiles(mockFiles);
      await filesService.createMetadata(mockFiles);
      const dbEntry = await filesService.getAllFileMetadata();
      const token = await filesService.createAccessToken(dbEntry[0].id);
      expect(token).toBeDefined();
      expect(token).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(token.length).toBe(32);
      expect(token).not.toBe(dbEntry[0].id);
    });
    it("should throw an error if file not found", async () => {
      await expect(
        filesService.createAccessToken("non-existent-id")
      ).rejects.toThrow("File not found");
    });
  });

  describe("getFile", () => {
    it("should return the file path for a given identifier", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.csv",
          originalname: "file1.csv",
          mimetype: "text/csv"
        },
        {
          size: 2000,
          filename: "file2.csv",
          originalname: "file2.csv",
          mimetype: "text/csv"
        }
      ] as Express.Multer.File[];

      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      mockFiles.forEach(async (mockFile) => {
        await fs.writeFile(
          path.join(testUploadDir, mockFile.filename),
          mockContent
        );
      });

      await filesService.uploadFiles(mockFiles);
      await filesService.createMetadata(mockFiles);
      const dbEntry = await filesService.getAllFileMetadata();

      const fileIdentifier = dbEntry[0].id;
      const accessToken = await filesService.createAccessToken(fileIdentifier);

      const streamableFile = await filesService.getFile(
        fileIdentifier,
        `Bearer ${accessToken}`
      );
      expect(streamableFile).toBeDefined();
    });
    it("should throw an error if file not found", async () => {
      await expect(filesService.getFile("non-existent-id")).rejects.toThrow(
        "File not found"
      );
    });
    it("should throw an error if access token is missing", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.csv",
          originalname: "file1.csv",
          mimetype: "text/csv"
        }
      ] as Express.Multer.File[];
      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      mockFiles.forEach(async (mockFile) => {
        await fs.writeFile(
          path.join(testUploadDir, mockFile.filename),
          mockContent
        );
      });
      await filesService.uploadFiles(mockFiles);
      await filesService.createMetadata(mockFiles);
      const dbEntry = await filesService.getAllFileMetadata();

      await expect(filesService.getFile(dbEntry[0].id)).rejects.toThrow(
        "Authorization header is required"
      );

      await expect(
        filesService.getFile(dbEntry[0].id, "unknown-auth-header")
      ).rejects.toThrow("Access token is required");
    });
    it("should throw an error if access token is invalid", async () => {
      const mockFiles = [
        {
          size: 1000,
          filename: "file1.csv",
          originalname: "file1.csv",
          mimetype: "text/csv"
        }
      ] as Express.Multer.File[];
      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      mockFiles.forEach(async (mockFile) => {
        await fs.writeFile(
          path.join(testUploadDir, mockFile.filename),
          mockContent
        );
      });
      await filesService.uploadFiles(mockFiles);
      await filesService.createMetadata(mockFiles);
      const dbEntry = await filesService.getAllFileMetadata();

      await expect(
        filesService.getFile(dbEntry[0].id, "Bearer invalid-token")
      ).rejects.toThrow("Invalid access token");
    });
  });

  describe("getCSVW", () => {
    it("should return CSVW metadata for a given file identifier", async () => {
      const mockFile = {
        filename: "test.csv",
        originalname: "test.csv",
        size: 1000,
        mimetype: "text/csv"
      } as Express.Multer.File;
      const mockContent = "col1,col2\nval1,val2\nval3,val4";
      await fs.writeFile(
        path.join(testUploadDir, mockFile.filename),
        mockContent
      );
      await filesService.uploadFiles([mockFile]);
      await filesService.createMetadata([mockFile]);
      const dbEntry = await filesService.getAllFileMetadata();

      const csvw = await filesService.getCSVW(dbEntry[0].id);
      expect(csvw).toBeDefined();
      await fs.rm(path.join(testUploadDir, mockFile.filename));
    });

    it("should throw an error if file not found", async () => {
      await expect(filesService.getCSVW("non-existent-id")).rejects.toThrow(
        "File not found"
      );
    });

    it("should throw an error if CSVW not found", async () => {
      const mockFile = {
        filename: "test.csv",
        originalname: "test.csv",
        size: 1000,
        mimetype: "text/csv"
      } as Express.Multer.File;
      await filesService.uploadFiles([mockFile]);
      const dbEntry = await filesService.getAllFileMetadata();

      await expect(filesService.getCSVW(dbEntry[0].id)).rejects.toThrow(
        "CSVW not found"
      );
    });
  });

  describe("removeFile", () => {
    it("should handle removal of files in normal operation", async () => {
      const mockFile = {
        filename: "test.csv",
        originalname: "test.csv",
        size: 1000,
        mimetype: "text/csv"
      } as Express.Multer.File;
      await fs.writeFile(
        path.join(testUploadDir, mockFile.filename),
        "col1,col2\nval1,val2\nval3,val4"
      );
      await filesService.uploadFiles([mockFile]);
      const dbEntry = await filesService.getAllFileMetadata();

      await expect(
        filesService.removeFile(dbEntry[0].id)
      ).resolves.toBeUndefined();
      await expect(filesService.removeFile(dbEntry[0].id)).rejects.toThrow(
        "File not found"
      );
      await expect(
        fs.access(path.join(testUploadDir, mockFile.filename))
      ).rejects.toThrow();
    });
    it("should handle removal of files when backing file is already removed", async () => {
      const mockFile = {
        filename: "test.csv",
        originalname: "test.csv",
        size: 1000,
        mimetype: "text/csv"
      } as Express.Multer.File;
      await fs.writeFile(
        path.join(testUploadDir, mockFile.filename),
        "col1,col2\nval1,val2\nval3,val4"
      );
      await filesService.uploadFiles([mockFile]);
      await filesService.createMetadata([mockFile]);
      const dbEntry = await filesService.getAllFileMetadata();

      await expect(
        filesService.removeFile(dbEntry[0].id)
      ).resolves.toBeUndefined();
      await expect(filesService.removeFile(dbEntry[0].id)).rejects.toThrow(
        "File not found"
      );
    });
    it("should handle removal of files when no dataset is created", async () => {
      const mockFile = {
        filename: "test.csv",
        originalname: "test.csv",
        size: 1000,
        mimetype: "text/csv"
      } as Express.Multer.File;
      await fs.writeFile(
        path.join(testUploadDir, mockFile.filename),
        "col1,col2\nval1,val2\nval3,val4"
      );
      await filesService.uploadFiles([mockFile]);
      const dbEntry = await filesService.getAllFileMetadata();
      await fs.rm(path.join(testUploadDir, mockFile.filename));
      await expect(
        filesService.removeFile(dbEntry[0].id)
      ).resolves.toBeUndefined();
      await expect(filesService.removeFile(dbEntry[0].id)).rejects.toThrow(
        "File not found"
      );
    });
  });
});
