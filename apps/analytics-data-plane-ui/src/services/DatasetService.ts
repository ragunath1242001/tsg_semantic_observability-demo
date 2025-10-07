import type { DatasetDto } from "@tsg-dsp/common-dsp";

import { DEFAULT_CONTEXTS } from "../config/metadata-wizard.constants";

export interface ExtendedDataset extends Omit<DatasetDto, "adms:sample"> {
  "adms:sample"?: {
    "@type": "Distribution";
    "@id": string;
    description: string[];
    "dcat:downloadURL": string;
    "dcat:mediaType": string;
  };
  "prov:wasGeneratedBy"?: {
    "@type": string;
    "prov:actedOnBehalfOf": string;
    "prov:endedAtTime": string;
  };
  "healthdcatap:populationCoverage"?: string;
  "dqv:hasQualityAnnotation"?: {
    "dqv:averageTime": string;
  };
  "dqv:accuracy"?: string;
  "dqv:coherence"?: string;
  "dqv:completeness"?: string;
  "dqv:consistency"?: string;
  "dqv:precision"?: string;
  "dqv:validity"?: string;
  "dpv:hasLegalBasis"?: string;
}

export class DatasetService {
  static createDefaultDataset(): ExtendedDataset {
    return {
      "@context": [...DEFAULT_CONTEXTS],
      "@id": "",
      "@type": "Dataset",
      title: "",
      description: [""],
      keyword: [],
      conformsTo: [],
      distribution: [
        {
          "@type": "Distribution",
          "@id": "",
          title: "",
          format: "",
          accessService: {
            "@type": "DataService",
            "@id": "",
            endpointURL: "",
            endpointDescription: ""
          }
        }
      ],
      hasPolicy: [
        {
          "@type": "Offer",
          "@id": "",
          assigner: "",
          permission: [
            {
              "@type": "Permission",
              action: "use"
            }
          ]
        }
      ],
      "adms:sample": {
        "@type": "Distribution",
        "@id": "",
        description: [""],
        "dcat:downloadURL": "",
        "dcat:mediaType": ""
      },
      "prov:wasGeneratedBy": {
        "@type": "prov:Activity",
        "prov:actedOnBehalfOf": "",
        "prov:endedAtTime": ""
      },
      "healthdcatap:hasCodingSystem": [],
      "healthdcatap:healthTheme": [],
      "healthdcatap:numberOfRecords": 0,
      "healthdcatap:numberOfUniqueIndividuals": 0,
      "healthdcatap:populationCoverage": "",
      "dqv:hasQualityAnnotation": { "dqv:averageTime": "" },
      "dqv:accuracy": "",
      "dqv:coherence": "",
      "dqv:completeness": "",
      "dqv:consistency": "",
      "dqv:precision": "",
      "dqv:validity": "",
      "dpv:hasLegalBasis": ""
    };
  }

  static mergeWithDefaults(datasetData: DatasetDto | null): ExtendedDataset {
    if (!datasetData) {
      return this.createDefaultDataset();
    }

    const defaultDataset = this.createDefaultDataset();
    const extendedData = datasetData as ExtendedDataset;

    return {
      ...defaultDataset,
      ...extendedData,
      distribution: extendedData.distribution || defaultDataset.distribution,
      hasPolicy: extendedData.hasPolicy || defaultDataset.hasPolicy,
      "adms:sample": {
        ...defaultDataset["adms:sample"],
        ...extendedData["adms:sample"]
      },
      "prov:wasGeneratedBy": {
        ...defaultDataset["prov:wasGeneratedBy"],
        ...extendedData["prov:wasGeneratedBy"]
      },
      "dqv:hasQualityAnnotation": {
        ...defaultDataset["dqv:hasQualityAnnotation"],
        ...extendedData["dqv:hasQualityAnnotation"]
      }
    } as ExtendedDataset;
  }

  static cleanEmptyValues(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      const cleaned = obj
        .filter((item) => {
          if (typeof item === "string") {
            return item.trim().length > 0;
          }
          return item !== null && item !== undefined;
        })
        .map((item) => this.cleanEmptyValues(item));
      return cleaned.length > 0 ? cleaned : undefined;
    }

    if (obj && typeof obj === "object") {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
              cleaned[key] = trimmed;
            }
          } else if (Array.isArray(value)) {
            const cleanedArray = this.cleanEmptyValues(value);
            if (cleanedArray !== undefined) {
              cleaned[key] = cleanedArray;
            }
          } else if (typeof value === "object") {
            const cleanedObj = this.cleanEmptyValues(value);
            if (
              cleanedObj &&
              typeof cleanedObj === "object" &&
              Object.keys(cleanedObj).length > 0
            ) {
              cleaned[key] = cleanedObj;
            }
          } else {
            cleaned[key] = value;
          }
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }

    return obj;
  }

  static prepareFinalDataset(dataset: ExtendedDataset): DatasetDto {
    const cleanedDataset = this.cleanEmptyValues(dataset) as DatasetDto;

    return {
      ...cleanedDataset,
      "@context": dataset["@context"],
      "@type": dataset["@type"],
      title: dataset.title || "",
      description: dataset.description?.filter((d) => d?.trim()) || [""]
    };
  }

  static isValidForCompletion(dataset: ExtendedDataset): boolean {
    return !!(dataset.title?.trim() && dataset.description?.[0]?.trim());
  }

  static hasSampleData(dataset: ExtendedDataset): boolean {
    return !!(
      dataset["adms:sample"]?.description?.[0] ||
      dataset["adms:sample"]?.["dcat:downloadURL"] ||
      dataset["adms:sample"]?.["dcat:mediaType"]
    );
  }

  static clearSampleData(dataset: ExtendedDataset): void {
    if (dataset["adms:sample"]) {
      dataset["adms:sample"].description = [""];
      dataset["adms:sample"]["dcat:downloadURL"] = "";
      dataset["adms:sample"]["dcat:mediaType"] = "";
    }
  }
}
