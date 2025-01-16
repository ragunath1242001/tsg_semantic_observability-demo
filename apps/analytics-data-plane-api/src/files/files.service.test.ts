import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "./files.service.js";
import { FileMetadataDao } from "./filesMetadata.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesConfig } from "../config.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";

describe("FilesService", () => {
  let filesService: FilesService;
  const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
  const __dirname = path.dirname(__filename); // get the name of the directory
  const testUploadDir = path.join(__dirname, "uploads_test"); // Temporary upload directory

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    await fs.mkdir(testUploadDir);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([FileMetadataDao]),
        TypeOrmModule.forFeature([FileMetadataDao])
      ],
      providers: [
        FilesService,
        {
          provide: FilesConfig,
          useValue: { path: testUploadDir }
        }
      ]
    }).compile();

    filesService = moduleRef.get(FilesService);
  });
  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
    await fs.rm(testUploadDir, { recursive: true, force: true }); // Clean up the test directory
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
        { size: 1000, filename: "file1.txt" },
        { size: 2000, filename: "file2.txt" }
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
        { size: 1000, filename: "file1.txt" },
        { size: 2000, filename: "file2.txt" }
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
});
