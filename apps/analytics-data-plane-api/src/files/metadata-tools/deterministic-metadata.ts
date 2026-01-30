import { format, isValid, parse as parseDate } from "date-fns";

import {
  AGE_COLUMN_PATTERNS,
  CODING_SYSTEM_PATTERNS,
  ColumnStatistics,
  DATE_FORMATS,
  DeterministicMetadata,
  ID_COLUMN_PATTERNS,
  NULL_PATTERNS,
  QualityMeasurement,
  XSDDatatype
} from "./metadata-types.js";

function toXSDDatatype(
  datatype: "string" | "integer" | "number" | "boolean" | "date" | "datetime"
): XSDDatatype {
  const mapping: Record<string, XSDDatatype> = {
    string: "xsd:string",
    integer: "xsd:integer",
    number: "xsd:decimal",
    boolean: "xsd:boolean",
    date: "xsd:date",
    datetime: "xsd:dateTime"
  };
  return mapping[datatype] || "xsd:string";
}

function fix2DigitYear(date: Date): Date {
  const year = date.getFullYear();
  if (year < 100) {
    // date-fns parsed it as a 1 or 2 digit year
    const pivotYear = 30;
    const adjustedYear = year <= pivotYear ? 2000 + year : 1900 + year;
    date.setFullYear(adjustedYear);
  }
  return date;
}

/**
 * Try to parse a date string using multiple common formats
 */
function tryParseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Don't try to parse pure numbers as dates (avoid false positives)
  // A pure integer like "100" or "2024" shouldn't be a date
  if (/^\d+$/.test(trimmed) && trimmed.length <= 4) {
    return null;
  }

  // Quick pattern check: must contain date separators or be ISO format
  // This avoids expensive parsing for strings that are clearly not dates
  if (!/[/-]|\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/.test(trimmed)) {
    return null;
  }

  // Try each format
  for (const formatString of DATE_FORMATS) {
    try {
      const parsed = parseDate(trimmed, formatString, new Date());
      if (isValid(parsed)) {
        return fix2DigitYear(parsed);
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback to native Date.parse for ISO strings and other standard formats
  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed) && !isNaN(nativeParsed.getTime())) {
    return nativeParsed;
  }

  return null;
}

/**
 * Check if a value looks like it has a time component
 */
function hasTimeComponent(value: string): boolean {
  return /\d{1,2}:\d{2}(:\d{2})?/.test(value.trim());
}

/**
 * Infer the data type of a column based on all its values
 */
function inferDataType(
  values: string[]
): "string" | "integer" | "number" | "boolean" | "date" | "datetime" {
  const nonEmptyValues = values.filter((v) => v && v.trim() !== "");

  if (nonEmptyValues.length === 0) {
    return "string";
  }

  // Check for boolean
  const allBooleans = nonEmptyValues.every((v) =>
    ["true", "false", "yes", "no", "1", "0"].includes(v.toLowerCase().trim())
  );
  if (allBooleans) {
    return "boolean";
  }

  // Performance optimization: Sample values for date checking instead of checking all
  // For large datasets, checking every value is too expensive
  const sampleSize = Math.min(100, nonEmptyValues.length);
  const step = Math.max(1, Math.floor(nonEmptyValues.length / sampleSize));
  const sampleValues = nonEmptyValues
    .filter((_, index) => index % step === 0)
    .slice(0, sampleSize);

  // Check for dates using our enhanced parser on sample
  const parsedDates = sampleValues.map((v) => ({
    value: v,
    parsed: tryParseDate(v),
    hasTime: hasTimeComponent(v)
  }));

  const allParsedSuccessfully = parsedDates.every((d) => d.parsed !== null);

  if (allParsedSuccessfully && parsedDates.length > 0) {
    // If sample looks like dates, verify with a few more random values
    // to reduce false positives
    if (nonEmptyValues.length > sampleSize) {
      const additionalSamples = [
        nonEmptyValues[Math.floor(nonEmptyValues.length * 0.25)],
        nonEmptyValues[Math.floor(nonEmptyValues.length * 0.5)],
        nonEmptyValues[Math.floor(nonEmptyValues.length * 0.75)]
      ];
      const additionalParsed = additionalSamples.every(
        (v) => tryParseDate(v) !== null
      );
      if (!additionalParsed) {
        // Fall through to check other types
      } else {
        // Check if most values have time components
        const withTimeCount = parsedDates.filter((d) => d.hasTime).length;
        if (withTimeCount > parsedDates.length * 0.5) {
          return "datetime";
        }
        return "date";
      }
    } else {
      // Check if most values have time components
      const withTimeCount = parsedDates.filter((d) => d.hasTime).length;
      if (withTimeCount > parsedDates.length * 0.5) {
        return "datetime";
      }
      return "date";
    }
  }

  // Check for integer
  const allIntegers = nonEmptyValues.every((v) => /^-?\d+$/.test(v.trim()));
  if (allIntegers) {
    return "integer";
  }

  // Check for number (float)
  const allNumbers = nonEmptyValues.every(
    (v) => !isNaN(Number(v.trim())) && v.trim() !== ""
  );
  if (allNumbers) {
    return "number";
  }

  return "string";
}

/**
 * Format a date as ISO 8601 date string
 */
function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Detect if a column might be an identifier
 */
function isLikelyIdentifier(
  columnName: string,
  uniqueCount: number,
  totalCount: number
): boolean {
  const nameMatch = ID_COLUMN_PATTERNS.some((pattern) =>
    pattern.test(columnName)
  );
  const highUniqueness = uniqueCount / totalCount > 0.95;
  return nameMatch || highUniqueness;
}

/**
 * Detect if a column might contain age data
 */
function isLikelyAgeColumn(
  columnName: string,
  min?: number,
  max?: number
): boolean {
  const nameMatch = AGE_COLUMN_PATTERNS.some((pattern) =>
    pattern.test(columnName)
  );
  const valueRange =
    min !== undefined &&
    max !== undefined &&
    min >= 0 &&
    max <= 130 &&
    max > min;
  return nameMatch && valueRange;
}

/**
 * Detect potential coding system from values
 */
function detectCodingSystem(
  sampleValues: string[]
): { name: string; uri: string } | null {
  for (const { pattern, name, uri } of CODING_SYSTEM_PATTERNS) {
    const matchCount = sampleValues.filter((v) =>
      pattern.test(v.trim())
    ).length;
    if (matchCount >= sampleValues.length * 0.8) {
      return { name, uri };
    }
  }
  return null;
}

/**
 * Detect null values present in the column
 */
function detectNullValues(values: string[]): string[] {
  const foundNulls = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (NULL_PATTERNS.includes(trimmed)) {
      foundNulls.add(trimmed);
    }
  }
  return Array.from(foundNulls);
}

/**
 * Infer a regex pattern for string columns with consistent format
 */
function inferPattern(values: string[]): string | undefined {
  const nonEmptyValues = values.filter((v) => v && v.trim() !== "");
  if (nonEmptyValues.length < 5) return undefined;

  // Check for email pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (nonEmptyValues.every((v) => emailPattern.test(v.trim()))) {
    return "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
  }

  // Check for URL pattern
  const urlPattern = /^https?:\/\/.+$/i;
  if (nonEmptyValues.every((v) => urlPattern.test(v.trim()))) {
    return "^https?://.*$";
  }

  // Check for UUID pattern
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (nonEmptyValues.every((v) => uuidPattern.test(v.trim()))) {
    return "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
  }

  // Check for phone number pattern (various formats)
  const phonePattern = /^[\d\s+()-]{7,20}$/;
  if (nonEmptyValues.every((v) => phonePattern.test(v.trim()))) {
    return "^[\\d\\s+()-]{7,20}$";
  }

  return undefined;
}

/**
 * Calculate mean for numeric values
 */
function calculateMean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Generate deterministic metadata from CSV data.
 *
 * @param headers - Array of column headers
 * @param rows - Array of data rows (each row is an array of string values)
 * @param filename - Original filename
 * @returns Deterministic metadata object
 */
export function generateDeterministicMetadata(
  headers: string[],
  rows: string[][],
  filename: string
): DeterministicMetadata {
  const columnCount = headers.length;
  const rowCount = rows.length;
  const metadataGenerated = new Date().toISOString();

  // Track detected coding systems across all columns
  const detectedCodingSystems = new Set<string>();
  let estimatedAgeRange: { min: number; max: number } | undefined;

  // Analyze each column
  const columns: ColumnStatistics[] = headers.map((header, colIndex) => {
    const values = rows.map((row) => row[colIndex] || "");
    const nonEmptyValues = values.filter((v) => v && v.trim() !== "");

    const datatype = inferDataType(values);
    const xsdDatatype = toXSDDatatype(datatype);
    const nullCount = values.filter((v) => !v || v.trim() === "").length;
    const uniqueValues = new Set(nonEmptyValues);
    const uniqueCount = uniqueValues.size;

    // Get sample values (up to 10 unique non-empty values)
    const sampleValues = Array.from(uniqueValues).slice(0, 10);

    // Detect null value representations
    const nullValues = detectNullValues(values);

    const stats: ColumnStatistics = {
      name: header,
      datatype,
      xsdDatatype,
      nullCount,
      uniqueCount,
      totalCount: rowCount,
      sampleValues,
      nullValues: nullValues.length > 0 ? nullValues : undefined
    };

    // Check for identifier columns
    stats.isLikelyIdentifier = isLikelyIdentifier(
      header,
      uniqueCount,
      rowCount
    );

    // Compute min/max/mean for numeric types
    if (datatype === "integer" || datatype === "number") {
      const numericValues = nonEmptyValues
        .map((v) => Number(v.trim()))
        .filter((n) => !isNaN(n));

      if (numericValues.length > 0) {
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);
        stats.mean = calculateMean(numericValues);

        // Check for age column
        if (isLikelyAgeColumn(header, stats.min, stats.max)) {
          stats.isLikelyAge = true;
          estimatedAgeRange = {
            min: Math.floor(stats.min),
            max: Math.ceil(stats.max)
          };
        }
      }
    }

    // Compute min/max for date types
    if (datatype === "date" || datatype === "datetime") {
      const dates = nonEmptyValues
        .map((v) => tryParseDate(v))
        .filter((d): d is Date => d !== null);

      if (dates.length > 0) {
        const timestamps = dates.map((d) => d.getTime());
        const minTimestamp = Math.min(...timestamps);
        const maxTimestamp = Math.max(...timestamps);
        stats.minDate = formatDate(new Date(minTimestamp));
        stats.maxDate = formatDate(new Date(maxTimestamp));
      }
    }

    // Detect coding system for string columns
    if (datatype === "string" && sampleValues.length > 0) {
      const codingSystem = detectCodingSystem(sampleValues);
      if (codingSystem) {
        stats.isLikelyCoded = true;
        stats.codingSystemHint = codingSystem.uri;
        detectedCodingSystems.add(codingSystem.uri);
      }

      // Infer pattern for string columns
      stats.pattern = inferPattern(nonEmptyValues);
    }

    return stats;
  });

  // Compute temporal coverage from date columns
  let temporalCoverage:
    | { startDate: string; endDate: string; interval: string }
    | undefined;
  const dateColumns = columns.filter(
    (col) =>
      (col.datatype === "date" || col.datatype === "datetime") &&
      col.minDate &&
      col.maxDate
  );

  if (dateColumns.length > 0) {
    const allMinDates = dateColumns
      .map((col) => col.minDate!)
      .filter(Boolean)
      .sort();
    const allMaxDates = dateColumns
      .map((col) => col.maxDate!)
      .filter(Boolean)
      .sort();

    if (allMinDates.length > 0 && allMaxDates.length > 0) {
      const startDate = allMinDates[0];
      const endDate = allMaxDates[allMaxDates.length - 1];
      temporalCoverage = {
        startDate,
        endDate,
        interval: `${startDate}/${endDate}`
      };
    }
  }

  // Compute completeness (percentage of non-null cells)
  const totalCells = rowCount * columnCount;
  const nullCells = columns.reduce((sum, col) => sum + col.nullCount, 0);
  const completeness =
    totalCells > 0 ? ((totalCells - nullCells) / totalCells) * 100 : 0;

  // Generate quality measurements
  const qualityMeasurements: QualityMeasurement[] = [
    {
      metric: "dqv:completeness",
      value: Math.round(completeness * 100) / 100,
      unit: "percent"
    },
    {
      metric: "dqv:numberOfRecords",
      value: rowCount
    },
    {
      metric: "dqv:numberOfAttributes",
      value: columnCount
    }
  ];

  // Add uniqueness measurement for potential key columns
  const identifierCols = columns.filter((col) => col.isLikelyIdentifier);
  if (identifierCols.length > 0) {
    const avgUniqueness =
      identifierCols.reduce(
        (sum, col) => sum + col.uniqueCount / col.totalCount,
        0
      ) / identifierCols.length;
    qualityMeasurements.push({
      metric: "dqv:uniqueness",
      value: Math.round(avgUniqueness * 10000) / 100,
      unit: "percent"
    });
  }

  // Simple heuristic: assume first row is headers if columns have reasonable names
  const hasHeaders = headers.every(
    (h) => h && typeof h === "string" && h.trim().length > 0
  );

  // Estimate byte size (rough calculation)
  const estimatedByteSize = rows.reduce(
    (sum, row) => {
      return sum + row.join(",").length + 1; // +1 for newline
    },
    headers.join(",").length + 1
  );

  return {
    filename,
    rowCount,
    columnCount,
    columns,
    temporalCoverage,
    completeness: Math.round(completeness * 100) / 100,
    qualityMeasurements,
    hasHeaders,
    estimatedAgeRange,
    detectedCodingSystems:
      detectedCodingSystems.size > 0
        ? Array.from(detectedCodingSystems)
        : undefined,
    estimatedByteSize,
    mediaType: "text/csv",
    metadataGenerated
  };
}

/**
 * CSVW Column metadata following W3C CSV on the Web specification
 * @see https://www.w3.org/TR/tabular-metadata/#columns
 */
export interface CSVWColumn {
  "@type"?: "csvw:Column";
  "csvw:name": string;
  "csvw:title"?: string | string[];
  "csvw:datatype"?: string; // XSD datatype
  "dct:description"?: string;
  "csvw:propertyUrl"?: string;
  "csvw:required"?: boolean;
  "csvw:null"?: string[];
  "csvw:minInclusive"?: number | string;
  "csvw:maxInclusive"?: number | string;
  "csvw:pattern"?: string;
  "tsg:uniqueCount"?: number;
  "tsg:mean"?: number;
  "tsg:nullCount"?: number;
  "healthdcatap:codingSystem"?: string;
}

/**
 * CSVW Table metadata
 * @see https://www.w3.org/TR/tabular-metadata/#tables
 */
export interface CSVWTable {
  "@type": "csvw:Table";
  "csvw:url"?: string;
  "dct:title"?: string;
  "dcat:keyword"?: string[];
  "csvw:column": CSVWColumn[];
  "csvw:primaryKey"?: string | string[];
  "csvw:rowCount"?: number;
}

/**
 * CSVW Table Group metadata
 * @see https://www.w3.org/TR/tabular-metadata/#table-groups
 */
export interface CSVWTableGroup {
  "@type": "csvw:TableGroup";
  "csvw:table": CSVWTable[];
}

/**
 * DCAT Distribution metadata
 * @see https://www.w3.org/TR/vocab-dcat-3/#Class:Distribution
 */
export interface DCATDistribution {
  "@type": "dcat:Distribution";
  "dct:title"?: string;
  "dct:description"?: string;
  "dcat:mediaType"?: string;
  "dct:format"?: string;
  "dcat:byteSize"?: number;
  "dcat:accessURL"?: string;
  "dcat:downloadURL"?: string;
  "dcatap:applicableLegislation"?: string[];
  "adms:status"?: string;
  "spdx:checksum"?: {
    "spdx:algorithm": string;
    "spdx:checksumValue": string;
  };
}

/**
 * DCAT Dataset metadata
 * @see https://www.w3.org/TR/vocab-dcat-3/#Class:Dataset
 * @see https://healthdataeu.pages.code.europa.eu/healthdcat-ap/releases/release-5/#Dataset
 */
export interface DCATDataset {
  "@type": "dcat:Dataset";
  "dct:title": string;
  "dct:description"?: string;
  "dct:identifier"?: string;
  "dct:issued"?: string;
  "dct:modified"?: string;
  "dct:language"?: string;
  "dcat:version"?: string;
  "dcat:keyword"?: string[];
  "dcat:theme"?: string[];
  "dct:temporal"?: {
    "@type": "dct:PeriodOfTime";
    "dcat:startDate"?: string;
    "dcat:endDate"?: string;
  };
  "dct:spatial"?: string;
  "dct:provenance"?: string;
  "dqv:hasQualityMeasurement"?: Array<{
    "@type": "dqv:QualityMeasurement";
    "dqv:isMeasurementOf": string;
    "dqv:value": number | string;
    "sdmx:unitMeasure"?: string;
  }>;
  "dcat:distribution"?: DCATDistribution;
  "dct:license"?: string;
  "dct:accessRights"?: string;
  "dct:conformsTo"?: string[];
  "dcatap:applicableLegislation"?: string[];
  // HealthDCAT-AP extensions
  "healthdcatap:numberOfRecords"?: number;
  "healthdcatap:numberOfUniqueIndividuals"?: number;
  "healthdcatap:minTypicalAge"?: number;
  "healthdcatap:maxTypicalAge"?: number;
  "healthdcatap:populationCoverage"?: string;
  "healthdcatap:healthCategory"?: string[];
  "healthdcatap:healthTheme"?: string[];
  "healthdcatap:hasCodingSystem"?: string[];
  // CSVW table schema for variable dictionary
  "csvw:tableSchema"?: CSVWTable;
  "dqv:completeness"?: string;
}

/**
 * Convert deterministic metadata to CSVW-compatible column format
 * @see https://www.w3.org/TR/tabular-metadata/#columns
 */
export function toCSVWColumns(metadata: DeterministicMetadata): CSVWColumn[] {
  return metadata.columns.map((col) => {
    // Generate a basic description from statistics
    const parts: string[] = [];

    if (col.datatype !== "string") {
      parts.push(`Type: ${col.datatype}`);
    }

    if (col.nullCount > 0) {
      const nullPercentage = (
        (col.nullCount / metadata.rowCount) *
        100
      ).toFixed(1);
      parts.push(`${nullPercentage}% null`);
    }

    if (col.uniqueCount !== undefined) {
      if (col.uniqueCount === metadata.rowCount) {
        parts.push("all unique values");
      } else if (col.uniqueCount <= 10) {
        parts.push(`${col.uniqueCount} distinct values`);
      }
    }

    if (col.min !== undefined && col.max !== undefined) {
      parts.push(`range: ${col.min} to ${col.max}`);
    }

    if (col.minDate && col.maxDate) {
      parts.push(`date range: ${col.minDate} to ${col.maxDate}`);
    }

    const csvwColumn: CSVWColumn = {
      "@type": "csvw:Column",
      "csvw:name": col.name,
      "csvw:title": col.name, // Human-readable title (same as name for now)
      "csvw:datatype": col.xsdDatatype,
      "dct:description": parts.length > 0 ? parts.join("; ") : undefined,
      "csvw:required": col.nullCount === 0,
      "tsg:nullCount": col.nullCount > 0 ? col.nullCount : undefined,
      "tsg:uniqueCount": col.uniqueCount
    };

    // Add null value representations if found
    if (col.nullValues && col.nullValues.length > 0) {
      csvwColumn["csvw:null"] = col.nullValues;
    }

    // Add min/max for numeric columns
    if (col.min !== undefined) {
      csvwColumn["csvw:minInclusive"] = col.min;
    }
    if (col.max !== undefined) {
      csvwColumn["csvw:maxInclusive"] = col.max;
    }
    if (col.mean !== undefined) {
      csvwColumn["tsg:mean"] = col.mean;
    }

    // Add min/max for date columns
    if (col.minDate) {
      csvwColumn["csvw:minInclusive"] = col.minDate;
    }
    if (col.maxDate) {
      csvwColumn["csvw:maxInclusive"] = col.maxDate;
    }

    // Add pattern for validated string columns
    if (col.pattern) {
      csvwColumn["csvw:pattern"] = col.pattern;
    }

    // Add coding system hint for coded columns
    if (col.codingSystemHint) {
      csvwColumn["healthdcatap:codingSystem"] = col.codingSystemHint;
    }

    return csvwColumn;
  });
}

/**
 * Convert deterministic metadata to full CSVW Table format
 * @see https://www.w3.org/TR/tabular-metadata/#tables
 */
export function toCSVWTable(metadata: DeterministicMetadata): CSVWTable {
  const columns = toCSVWColumns(metadata);

  // Detect potential primary key columns
  const primaryKeyColumns = metadata.columns.filter(
    (col) => col.isLikelyIdentifier && col.uniqueCount === metadata.rowCount
  );

  return {
    "@type": "csvw:Table",
    "dct:title": metadata.filename,
    "csvw:column": columns,
    "csvw:primaryKey":
      primaryKeyColumns.length > 0
        ? primaryKeyColumns.map((col) => col.name)
        : undefined,
    "csvw:rowCount": metadata.rowCount
  };
}

/**
 * Convert deterministic metadata to DCAT-compatible dataset format
 * @see https://www.w3.org/TR/vocab-dcat-3/#Class:Dataset
 * @see https://healthdataeu.pages.code.europa.eu/healthdcat-ap/releases/release-5/#Dataset
 */
export function toDCATDataset(
  metadata: DeterministicMetadata,
  maxColumnCount: number = 100
): DCATDataset {
  // Generate a factual description
  const descriptionParts = [
    `CSV dataset with ${metadata.rowCount} rows and ${metadata.columnCount} columns.`
  ];

  // Add data type summary
  const typeCount: Record<string, number> = {};
  metadata.columns.forEach((col) => {
    typeCount[col.datatype] = (typeCount[col.datatype] || 0) + 1;
  });

  const typeSummary = Object.entries(typeCount)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  descriptionParts.push(`Column types: ${typeSummary}.`);

  if (metadata.completeness < 100) {
    descriptionParts.push(
      `Data completeness: ${metadata.completeness.toFixed(1)}%.`
    );
  }

  if (metadata.temporalCoverage) {
    descriptionParts.push(
      `Temporal coverage: ${metadata.temporalCoverage.startDate} to ${metadata.temporalCoverage.endDate}.`
    );
  }

  // Generate keywords from column names (simple extraction)
  const keywords = metadata.columns
    .map((col) => col.name)
    .filter((name) => name.length > 2 && name.length < 30)
    .slice(0, 10);

  // Map completeness to DQV vocabulary matching UI options
  // UI options: "not-documented", "some-variables", "all-variables"
  let dqvCompleteness: string;
  if (metadata.completeness >= 99) {
    dqvCompleteness = "all-variables";
  } else if (metadata.completeness >= 50) {
    dqvCompleteness = "some-variables";
  } else {
    dqvCompleteness = "not-documented";
  }

  // Build quality measurements array
  const qualityMeasurements = metadata.qualityMeasurements.map((qm) => ({
    "@type": "dqv:QualityMeasurement" as const,
    "dqv:isMeasurementOf": qm.metric,
    "dqv:value": qm.value,
    "sdmx:unitMeasure": qm.unit
  }));

  // Build CSVW table schema for variable dictionary
  const csvwTableSchema =
    metadata.columnCount < maxColumnCount ? toCSVWTable(metadata) : undefined;

  const dcatDataset: DCATDataset = {
    "@type": "dcat:Dataset",
    "dct:title": metadata.filename,
    "dct:description": descriptionParts.join(" "),
    "dct:issued": metadata.metadataGenerated,
    "dct:modified": metadata.metadataGenerated,
    "dcat:keyword": keywords,
    "dqv:hasQualityMeasurement": qualityMeasurements,
    "dcat:distribution": {
      "@type": "dcat:Distribution",
      "dct:title": `${metadata.filename} - CSV Distribution`,
      "dcat:mediaType": metadata.mediaType,
      "dct:format": "CSV",
      "dcat:byteSize": metadata.estimatedByteSize
    },
    "dct:conformsTo": [
      "https://www.w3.org/TR/tabular-metadata/", // CSVW
      "https://www.w3.org/TR/vocab-dcat-3/" // DCAT 3
    ],
    "csvw:tableSchema": csvwTableSchema,
    // HealthDCAT-AP extensions
    "healthdcatap:numberOfRecords": metadata.rowCount,
    "healthdcatap:hasCodingSystem": metadata.detectedCodingSystems,
    // Backward compatibility fields
    "dqv:completeness": dqvCompleteness
  };

  // Add temporal coverage if available
  if (metadata.temporalCoverage) {
    dcatDataset["dct:temporal"] = {
      "@type": "dct:PeriodOfTime",
      "dcat:startDate": metadata.temporalCoverage.startDate,
      "dcat:endDate": metadata.temporalCoverage.endDate
    };
  }

  // Add age range if detected (HealthDCAT-AP)
  if (metadata.estimatedAgeRange) {
    dcatDataset["healthdcatap:minTypicalAge"] = metadata.estimatedAgeRange.min;
    dcatDataset["healthdcatap:maxTypicalAge"] = metadata.estimatedAgeRange.max;
  }

  return dcatDataset;
}
