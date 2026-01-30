import { LanguageModelV3 } from "@ai-sdk/provider";
import { Injectable, Logger } from "@nestjs/common";

import { FilesConfig, LLMConfig } from "../config.js";
import {
  ColumnMetadataEnhancement,
  CombinedMetadataResult,
  createModelFromConfig,
  DatasetMetadataEnhancement,
  DeterministicMetadata,
  generateDeterministicMetadata,
  generateLLMGeneratedMetadata,
  toCSVWColumns,
  toDCATDataset
} from "./metadata-tools/index.js";

@Injectable()
export class MetadataGeneratorService {
  private readonly logger = new Logger(MetadataGeneratorService.name);
  private model: LanguageModelV3 | null = null;

  constructor(
    private readonly llmConfig: LLMConfig,
    private readonly filesConfig: FilesConfig
  ) {
    if (this.llmConfig.enabled) {
      this.initializeModel();
    }
  }

  private initializeModel(): void {
    try {
      this.model = createModelFromConfig(this.llmConfig);
      this.logger.log(`AI model initialized for metadata enhancement`);
    } catch (error) {
      this.logger.error("Failed to initialize AI model", error);
      this.model = null;
    }
  }

  /**
   * Check if LLM enhancement is available
   */
  isReady(): boolean {
    return this.model !== null && this.llmConfig.enabled;
  }

  async generateMetadata(
    headers: string[],
    rows: string[][],
    filename: string,
    useLLM: boolean = true,
    llmRows?: string[][]
  ): Promise<CombinedMetadataResult> {
    const startTime = Date.now();

    // Step 1: Always generate deterministic metadata first
    this.logger.debug(
      `Generating deterministic metadata for ${filename} (${rows.length} rows, ${headers.length} columns)`
    );

    const deterministicData = generateDeterministicMetadata(
      headers,
      rows,
      filename
    );

    // Convert to CSVW column format with full metadata
    const csvwColumns = toCSVWColumns(deterministicData);
    const columns: ColumnMetadataEnhancement[] = csvwColumns.map((col) => ({
      "@type": "csvw:Column",
      "csvw:name": col["csvw:name"],
      "csvw:title": col["csvw:title"],
      "csvw:datatype": col["csvw:datatype"],
      "dct:description": col["dct:description"],
      "csvw:required": col["csvw:required"],
      "csvw:null": col["csvw:null"],
      "tsg:nullCount": col["tsg:nullCount"],
      "tsg:uniqueCount": col["tsg:uniqueCount"],
      "csvw:minInclusive": col["csvw:minInclusive"],
      "csvw:maxInclusive": col["csvw:maxInclusive"],
      "csvw:pattern": col["csvw:pattern"],
      "healthdcatap:codingSystem": col["healthdcatap:codingSystem"]
    }));

    // Convert to DCAT dataset format with full metadata
    const dcatDataset = toDCATDataset(
      deterministicData,
      this.filesConfig.maxInlineMetadataColumns
    );
    const dataset: DatasetMetadataEnhancement = {
      "@type": "dcat:Dataset",
      "dct:title": dcatDataset["dct:title"],
      "dct:description": dcatDataset["dct:description"],
      "dct:identifier": dcatDataset["dct:identifier"],
      "dct:issued": dcatDataset["dct:issued"],
      "dct:modified": dcatDataset["dct:modified"],
      "dcat:keyword": dcatDataset["dcat:keyword"],
      "dcat:theme": dcatDataset["dcat:theme"],
      "dct:temporal": dcatDataset["dct:temporal"]
        ? (dcatDataset["dct:temporal"]["dcat:startDate"] || "") +
          "/" +
          (dcatDataset["dct:temporal"]["dcat:endDate"] || "")
        : undefined,
      "dcat:startDate": dcatDataset["dct:temporal"]?.["dcat:startDate"],
      "dcat:endDate": dcatDataset["dct:temporal"]?.["dcat:endDate"],
      "dqv:completeness": dcatDataset["dqv:completeness"],
      "dqv:hasQualityMeasurement": dcatDataset[
        "dqv:hasQualityMeasurement"
      ]?.map((qm) => ({
        "dqv:isMeasurementOf": qm["dqv:isMeasurementOf"],
        "dqv:value": qm["dqv:value"]
      })),
      "dcat:distribution": dcatDataset["dcat:distribution"]
        ? {
            "@type": "dcat:Distribution",
            "dcat:mediaType":
              dcatDataset["dcat:distribution"]["dcat:mediaType"],
            "dcat:byteSize": dcatDataset["dcat:distribution"]["dcat:byteSize"],
            "dct:format": dcatDataset["dcat:distribution"]["dct:format"]
          }
        : undefined,
      "dct:conformsTo": dcatDataset["dct:conformsTo"],
      "healthdcatap:numberOfRecords":
        dcatDataset["healthdcatap:numberOfRecords"],
      "healthdcatap:minTypicalAge": dcatDataset["healthdcatap:minTypicalAge"],
      "healthdcatap:maxTypicalAge": dcatDataset["healthdcatap:maxTypicalAge"],
      "healthdcatap:hasCodingSystem":
        dcatDataset["healthdcatap:hasCodingSystem"],
      "csvw:tableSchema": dcatDataset["csvw:tableSchema"]
    };

    if (useLLM && this.isReady()) {
      try {
        const rowsForLLM = llmRows || rows;
        this.logger.debug(
          `Enhancing metadata with LLM for ${filename} using ${rowsForLLM.length} rows (${rows.length} total rows)`
        );

        // Generate deterministic metadata from the LLM subset for LLM context
        const llmContextData = llmRows
          ? generateDeterministicMetadata(headers, rowsForLLM, filename)
          : deterministicData;

        const subjectiveData = await generateLLMGeneratedMetadata(
          this.model!,
          llmContextData
        );

        // Merge LLM-generated subjective fields with deterministic facts
        // Subjective fields from LLM:
        dataset["dct:title"] = subjectiveData.title || dataset["dct:title"];
        dataset["dct:description"] =
          subjectiveData.description || dataset["dct:description"];
        dataset["dcat:keyword"] =
          subjectiveData.keywords || dataset["dcat:keyword"];
        dataset["dcat:theme"] = subjectiveData.theme;

        // HealthDCAT-AP extensions from LLM
        if (subjectiveData.healthCategory) {
          dataset["healthdcatap:healthCategory"] =
            subjectiveData.healthCategory;
        }
        if (subjectiveData.healthTheme) {
          dataset["healthdcatap:healthTheme"] = subjectiveData.healthTheme;
        }
        if (subjectiveData.populationCoverage) {
          dataset["healthdcatap:populationCoverage"] =
            subjectiveData.populationCoverage;
        }
        if (subjectiveData.provenance) {
          dataset["dct:provenance"] = subjectiveData.provenance;
        }
        if (subjectiveData.suggestedStandards) {
          dataset["dct:conformsTo"] = [
            ...(dataset["dct:conformsTo"] || []),
            ...subjectiveData.suggestedStandards
          ];
        }

        // Factual fields are preserved from deterministic analysis:
        // - temporal, healthdcatap:numberOfRecords, minTypicalAge, maxTypicalAge stay unchanged

        // Merge column descriptions from LLM
        if (subjectiveData.columnDescriptions) {
          for (const colDesc of subjectiveData.columnDescriptions) {
            const column = columns.find((c) => c["csvw:name"] === colDesc.name);
            if (column) {
              column["dct:description"] = colDesc.description;
            }
          }
        }

        const duration = Date.now() - startTime;
        this.logger.log(
          `Generated metadata for ${filename} in ${duration}ms (deterministic + LLM)`
        );

        return { columns, dataset };
      } catch (error) {
        this.logger.warn(
          `LLM enhancement failed for ${filename}, using deterministic metadata only: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Generated metadata for ${filename} in ${duration}ms (deterministic only)`
    );

    return { columns, dataset };
  }

  getDeterministicMetadata(
    headers: string[],
    rows: string[][],
    filename: string
  ): DeterministicMetadata {
    return generateDeterministicMetadata(headers, rows, filename);
  }
}
