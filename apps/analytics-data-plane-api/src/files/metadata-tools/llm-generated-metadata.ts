import { LanguageModelV3 } from "@ai-sdk/provider";
import { generateText, Output } from "ai";
import { z } from "zod";

import {
  DCAT_THEMES,
  DeterministicMetadata,
  HEALTH_CATEGORIES,
  KNOWN_HEALTH_THEMES
} from "./metadata-types.js";

/**
 * Schema for LLM-generated subjective metadata
 * Aligned with DCAT3 and HealthDCAT-AP
 */
export const LLMGeneratedMetadataSchema = z.object({
  // Core DCAT fields
  title: z
    .string()
    .describe(
      "A clear, descriptive title for the dataset following DCAT naming conventions (improve on filename if needed)"
    ),
  description: z
    .string()
    .describe(
      "A 2-4 sentence description explaining what the data contains, its potential uses, and any important context (dct:description)"
    ),
  keywords: z
    .array(z.string())
    .describe(
      "5-10 relevant keywords for search and discovery, including domain-specific terms (dcat:keyword)"
    ),
  theme: z
    .array(z.string())
    .optional()
    .describe(
      `Thematic categories from EU Data Theme vocabulary: ${DCAT_THEMES.join(", ")}. Use 'HEAL' for health-related datasets.`
    ),

  // Column descriptions (CSVW)
  columnDescriptions: z
    .array(
      z.object({
        name: z.string(),
        description: z
          .string()
          .describe(
            "Brief human-readable description of what this column contains (csvw:description)"
          ),
        semanticType: z
          .string()
          .optional()
          .describe(
            "Semantic type or category (e.g., 'identifier', 'measurement', 'categorical', 'temporal', 'geographic')"
          )
      })
    )
    .optional()
    .describe("Human-readable descriptions for each column"),

  // HealthDCAT-AP extensions
  healthCategory: z
    .array(z.string())
    .optional()
    .describe(
      `Health category classification: ${HEALTH_CATEGORIES.join(", ")} (healthdcatap:healthCategory)`
    ),
  healthTheme: z
    .array(z.string())
    .optional()
    .describe(
      `Health themes from the controlled vocabulary. Use ONLY these exact values: ${KNOWN_HEALTH_THEMES.join(", ")}. (healthdcatap:healthTheme)`
    ),
  populationCoverage: z
    .string()
    .optional()
    .describe(
      "Description of the population covered (e.g., 'Adults aged 18-65 with diabetes in the Netherlands') (healthdcatap:populationCoverage)"
    ),
  provenance: z
    .string()
    .optional()
    .describe(
      "Brief description of data collection methodology or source (dct:provenance)"
    ),
  purpose: z
    .string()
    .optional()
    .describe(
      "Intended purpose of the dataset (e.g., 'research', 'clinical decision support', 'public health monitoring') (dpv:hasPurpose)"
    ),

  // Data quality observations
  qualityNotes: z
    .string()
    .optional()
    .describe(
      "Any observations about data quality, completeness, or limitations"
    ),

  // Suggested conformance standards
  suggestedStandards: z
    .array(z.string())
    .optional()
    .describe(
      "Suggested data standards the dataset may conform to (e.g., 'HL7 FHIR', 'OMOP CDM', 'CDISC')"
    )
});

export type LLMGeneratedMetadata = z.infer<typeof LLMGeneratedMetadataSchema>;

export async function generateLLMGeneratedMetadata(
  model: LanguageModelV3,
  deterministicMetadata: DeterministicMetadata
): Promise<LLMGeneratedMetadata> {
  // Build a compact representation of the data for the LLM
  const columnSummary = deterministicMetadata.columns
    .slice(0, 30) // Limit to first 30 columns to avoid context overflow
    .map((col) => {
      const parts = [`${col.name} (${col.xsdDatatype})`];
      if (col.uniqueCount <= 10 && col.sampleValues.length > 0) {
        parts.push(`values: ${col.sampleValues.slice(0, 5).join(", ")}`);
      }
      if (col.min !== undefined && col.max !== undefined) {
        parts.push(`range: ${col.min}-${col.max}`);
      }
      if (col.minDate && col.maxDate) {
        parts.push(`dates: ${col.minDate} to ${col.maxDate}`);
      }
      if (col.isLikelyIdentifier) {
        parts.push("[likely identifier]");
      }
      if (col.isLikelyAge) {
        parts.push("[age data]");
      }
      if (col.codingSystemHint) {
        parts.push(`[coded: ${col.codingSystemHint}]`);
      }
      return parts.join(" - ");
    })
    .join("\n");

  // Include detected coding systems
  const codingSystemsInfo = deterministicMetadata.detectedCodingSystems
    ? `\n**Detected Coding Systems:** ${deterministicMetadata.detectedCodingSystems.join(", ")}`
    : "";

  // Include age range if detected
  const ageRangeInfo = deterministicMetadata.estimatedAgeRange
    ? `\n**Age Range:** ${deterministicMetadata.estimatedAgeRange.min}-${deterministicMetadata.estimatedAgeRange.max} years`
    : "";

  const prompt = `Generate comprehensive metadata in json for this CSV dataset following DCAT3 and HealthDCAT-AP standards:

**File:** ${deterministicMetadata.filename}
**Size:** ${deterministicMetadata.rowCount.toLocaleString()} rows × ${deterministicMetadata.columnCount} columns
**Completeness:** ${deterministicMetadata.completeness.toFixed(1)}%
${deterministicMetadata.temporalCoverage ? `**Time Period:** ${deterministicMetadata.temporalCoverage.startDate} to ${deterministicMetadata.temporalCoverage.endDate}` : ""}${codingSystemsInfo}${ageRangeInfo}

**Columns:**
${columnSummary}
${deterministicMetadata.columns.length > 30 ? `\n... and ${deterministicMetadata.columns.length - 30} more columns` : ""}

Based on this data structure, generate:
1. A clear, descriptive title (improve on filename if it's not descriptive)
2. A 2-4 sentence description of what this dataset contains and how it might be used
3. 5-10 relevant keywords for search/discovery
4. Thematic categories from EU Data Theme vocabulary (use HEAL for health data)
5. Brief descriptions for the columns listed above, including their semantic type
6. If health-related: health categories, health themes, and population coverage
7. Data provenance notes if inferrable
8. Suggested data standards the dataset may conform to

Focus on accurate, factual descriptions based on the column names and sample values provided.`;

  const { output } = await generateText({
    model,
    output: Output.object({
      schema: LLMGeneratedMetadataSchema
    }),
    prompt
  });

  return output;
}
