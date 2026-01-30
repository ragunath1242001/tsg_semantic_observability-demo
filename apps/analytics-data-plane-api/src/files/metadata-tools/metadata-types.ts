/**
 * Shared interfaces and constants for metadata tools
 */
export type XSDDatatype =
  | "xsd:string"
  | "xsd:integer"
  | "xsd:decimal"
  | "xsd:boolean"
  | "xsd:date"
  | "xsd:dateTime"
  | "xsd:time"
  | "xsd:gYear"
  | "xsd:gYearMonth"
  | "xsd:anyURI"
  | "xsd:nonNegativeInteger";

export interface ColumnStatistics {
  name: string;
  datatype: "string" | "integer" | "number" | "boolean" | "date" | "datetime";
  xsdDatatype: XSDDatatype;
  nullCount: number;
  uniqueCount: number;
  totalCount: number;
  sampleValues: string[];
  min?: number;
  max?: number;
  mean?: number;
  minDate?: string;
  maxDate?: string;
  pattern?: string;
  nullValues?: string[];
  isLikelyIdentifier?: boolean;
  isLikelyAge?: boolean;
  isLikelyCoded?: boolean;
  codingSystemHint?: string;
}

export interface QualityMeasurement {
  metric: string;
  value: number | string;
  unit?: string;
}

export interface DeterministicMetadata {
  filename: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnStatistics[];
  temporalCoverage?: {
    startDate: string;
    endDate: string;
    interval: string;
  };
  completeness: number;
  qualityMeasurements: QualityMeasurement[];
  hasHeaders: boolean;
  estimatedAgeRange?: { min: number; max: number };
  detectedCodingSystems?: string[];
  estimatedByteSize?: number;
  mediaType: string;
  metadataGenerated: string;
}

export const NULL_PATTERNS = [
  "",
  "null",
  "NULL",
  "Null",
  "NA",
  "N/A",
  "n/a",
  "NaN",
  "nan",
  "None",
  "none",
  "NONE",
  "-",
  "--",
  ".",
  "?",
  "undefined",
  "UNDEFINED",
  "#N/A",
  "#NA",
  "#NULL!",
  "missing",
  "MISSING"
];

export const AGE_COLUMN_PATTERNS = [
  /^age$/i,
  /^age_/i,
  /_age$/i,
  /^leeftijd$/i,
  /^patient_age$/i,
  /^subject_age$/i,
  /^participant_age$/i,
  /^years$/i,
  /^years_old$/i
];

export const ID_COLUMN_PATTERNS = [
  /^id$/i,
  /_id$/i,
  /^.*_id$/i,
  /^identifier$/i,
  /^uuid$/i,
  /^guid$/i,
  /^key$/i,
  /^code$/i,
  /^patient_id$/i,
  /^subject_id$/i,
  /^participant_id$/i,
  /^record_id$/i
];

export const CODING_SYSTEM_PATTERNS: Array<{
  pattern: RegExp;
  name: string;
  uri: string;
}> = [
  {
    pattern: /^[A-Z]\d{2}(\.\d+)?$/,
    name: "ICD-10",
    uri: "http://hl7.org/fhir/sid/icd-10"
  },
  {
    pattern: /^\d{3}\.\d{1,2}$/,
    name: "ICD-9-CM",
    uri: "http://hl7.org/fhir/sid/icd-9-cm"
  },
  { pattern: /^\d{5,18}$/, name: "SNOMED-CT", uri: "http://snomed.info/sct" },
  { pattern: /^[A-Z0-9]{5,7}$/, name: "LOINC", uri: "http://loinc.org" },
  {
    pattern: /^[A-Z]{3}$/,
    name: "ISO-4217 Currency",
    uri: "http://publications.europa.eu/resource/authority/currency"
  },
  {
    pattern: /^[A-Z]{2}$/,
    name: "ISO-3166-1 Country",
    uri: "http://publications.europa.eu/resource/authority/country"
  },
  {
    pattern: /^[a-z]{2,3}(-[A-Z]{2})?$/,
    name: "BCP-47 Language",
    uri: "http://publications.europa.eu/resource/authority/language"
  }
];

export const DATE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "M/d/yy",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "MM/dd/yy",
  "d/M/yy",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd/MM/yy",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd HH:mm:ss",
  "M-d-yyyy",
  "M-d-yy",
  "d-M-yyyy",
  "d-M-yy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "d MMM yyyy",
  "d MMMM yyyy"
];

export const DCAT_THEMES = [
  "AGRI",
  "ECON",
  "EDUC",
  "ENER",
  "ENVI",
  "GOVE",
  "HEAL",
  "INTR",
  "JUST",
  "OP_DATPRO",
  "REGI",
  "SOCI",
  "TECH",
  "TRAN"
] as const;

// Health categories as defined in HealthDCAT-AP specification
export const HEALTH_CATEGORIES = [
  "EHRS",
  "CLAIMS",
  "REGISTRY",
  "GENOMIC",
  "PUBLIC_HEALTH",
  "CLINICAL_TRIALS",
  "MEDICAL_DEVICES",
  "WELLNESS",
  "BIOBANKS",
  "SURVEYS",
  "OTHER"
] as const;

// Health themes are picked from a controlled vocabulary from the HealthDCAT-AP specification
export const KNOWN_HEALTH_THEMES = [
  "ANTIMICROBIAL_CONTROL",
  "BLOOD_INFECTIONS",
  "CANCER_DISEASE",
  "CLIMATE_HEALTH",
  "EMERGENCY_SETTINGS",
  "ENTERIC_INFECTIONS",
  "ENVIRONMENTAL_HEALTH",
  "HEALTH_PRODUCTS",
  "HEALTH_SYSTEMS",
  "IMMUNIZATION_DISEASES",
  "INJURY_PREVENTION",
  "LIFECOURSE_HEALTH",
  "MENTAL_HEALTH",
  "NONCOMMUNICABLE_DISEASES",
  "NUTRITION_SECURITY",
  "REPRODUCTIVE_HEALTH",
  "RESPIRATORY_DISEASES",
  "SENSORY_HEALTH",
  "TROPICAL_DISEASES",
  "VECTOR_DISEASES"
] as const;

export interface ColumnMetadataEnhancement {
  // Core CSVW properties (csvw:Column)
  "@type"?: "csvw:Column";
  "csvw:name": string; // Technical name as in CSV header
  "csvw:title"?: string | string[]; // Human-readable title(s), can be multilingual
  "csvw:datatype"?: string; // XSD datatype (string, integer, decimal, date, dateTime, boolean, etc.)
  "dct:description"?: string; // Column description from Dublin Core

  // CSVW Extended properties
  "csvw:propertyUrl"?: string; // RDF predicate URI for semantic mapping
  "csvw:required"?: boolean; // Whether column values are required (non-null)
  "csvw:null"?: string | string[]; // Values representing null (e.g., "NA", "N/A", "")
  "csvw:default"?: string; // Default value for null cells
  "csvw:separator"?: string; // For multi-value cells
  "csvw:ordered"?: boolean; // Whether order of values matters
  "csvw:lang"?: string; // Language tag for string values (BCP 47)

  // Statistical properties (computed from data)
  "tsg:nullCount"?: number; // Count of null values
  "tsg:uniqueCount"?: number; // Number of distinct values
  "csvw:minInclusive"?: number | string; // Minimum value
  "csvw:maxInclusive"?: number | string; // Maximum value
  "csvw:pattern"?: string; // Regex pattern for validation

  // HealthDCAT-AP specific
  "healthdcatap:codingSystem"?: string; // Coding system URI (ICD-10, SNOMED-CT, etc.)
}

/**
 * DCAT3 and HealthDCAT-AP compliant dataset metadata
 * @see https://www.w3.org/TR/vocab-dcat-3/#Class:Dataset
 * @see https://healthdataeu.pages.code.europa.eu/healthdcat-ap/releases/release-5/#Dataset
 */
export interface DatasetMetadataEnhancement {
  // Core DCAT properties (dct:)
  "@type"?: "dcat:Dataset";
  "dct:title"?: string; // dct:title
  "dct:description"?: string; // dct:description
  "dct:identifier"?: string; // dct:identifier - unique dataset identifier
  "dct:issued"?: string; // dct:issued - release date (ISO 8601)
  "dct:modified"?: string; // dct:modified - last modification date (ISO 8601)
  "dct:language"?: string; // dct:language - dataset language (BCP 47 or URI)
  "dcat:version"?: string; // dcat:version - version indicator

  // Discovery & classification (dcat:)
  "dcat:keyword"?: string[]; // dcat:keyword - search/discovery keywords
  "dcat:theme"?: string[]; // dcat:theme - thematic categories (from controlled vocabulary)

  // Coverage (dct:spatial, dct:temporal)
  "dct:temporal"?: string; // dct:temporal - ISO 8601 time period (start/end)
  "dcat:startDate"?: string; // Start of temporal coverage
  "dcat:endDate"?: string; // End of temporal coverage
  "dct:spatial"?: string; // dct:spatial - geographic coverage (URI or text)

  // Provenance & quality (prov:, dqv:)
  "dct:provenance"?: string; // Provenance statement
  "dqv:completeness"?: string; // Data completeness indicator
  "dqv:hasQualityMeasurement"?: Array<{
    "dqv:isMeasurementOf": string;
    "dqv:value": number | string;
  }>;

  // Distribution metadata (dcat:Distribution)
  "dcat:distribution"?: {
    "@type"?: "dcat:Distribution";
    "dcat:mediaType"?: string; // IANA media type (text/csv)
    "dcat:byteSize"?: number; // File size in bytes
    "dct:format"?: string; // File format (CSV)
    "dcat:compressFormat"?: string; // Compression format if any
    "spdx:checksum"?: {
      "spdx:algorithm": string;
      "spdx:checksumValue": string;
    };
  };

  // Rights & licensing (dct:, odrl:)
  "dct:license"?: string; // dct:license - license document URI
  "dct:accessRights"?: string; // Access rights (public, restricted, non-public)
  "dct:rights"?: string; // Rights statement

  // DCAT-AP conformance
  "dcatap:applicableLegislation"?: string[]; // Applicable legislation URIs
  "dct:conformsTo"?: string[]; // Standards the dataset conforms to

  // HealthDCAT-AP extensions (healthdcatap:)
  "healthdcatap:numberOfRecords"?: number; // Total record count
  "healthdcatap:numberOfUniqueIndividuals"?: number; // Unique individuals count
  "healthdcatap:minTypicalAge"?: number; // Minimum age in dataset
  "healthdcatap:maxTypicalAge"?: number; // Maximum age in dataset
  "healthdcatap:populationCoverage"?: string; // Population description
  "healthdcatap:healthCategory"?: string[]; // EHDS health category
  "healthdcatap:healthTheme"?: string[]; // Health themes
  "healthdcatap:hasCodingSystem"?: string[]; // Coding systems used (ICD-10, SNOMED, etc.)
  "healthdcatap:hasCodeValues"?: Array<{
    "skos:notation": string;
    "skos:prefLabel": string;
    "skos:inScheme"?: string;
  }>;

  // CSVW Table metadata (for variable dictionary)
  "csvw:tableSchema"?: {
    "@type"?: "csvw:TableGroup" | "csvw:Table";
    "csvw:columns"?: ColumnMetadataEnhancement[];
    "csvw:primaryKey"?: string | string[];
    "csvw:aboutUrl"?: string;
  };
}

export interface CombinedMetadataResult {
  columns: ColumnMetadataEnhancement[];
  dataset: DatasetMetadataEnhancement;
}
