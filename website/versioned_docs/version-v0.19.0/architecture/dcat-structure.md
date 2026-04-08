# DCAT Metadata Structure

Since the Dataspace Protocol (DSP) uses [DCAT 3](https://www.w3.org/TR/vocab-dcat-3/) (Data Catalog Vocabulary) for describing catalog entries, we have setup a DCAT structure for the TSG.
This document describes the DCAT structure used in the TNO Security Gateway for representing data catalogs, datasets, and their distributions.

## Overview

The implementation of DCAT enables standardized discovery and exchange of dataset information between participants. The implementation extends DCAT with domain-specific vocabularies like [HealthDCAT-AP](https://healthdataeu.pages.code.europa.eu/healthdcat-ap/) for health data scenarios.

## Core DCAT Structure

The TSG uses a hierarchical DCAT structure to organize data resources:

```
Catalog
├── DataService (DSP API endpoint)
└── Dataset
    ├── dct:conformsTo → Ontology, legislation, standards
    │   └── (e.g., HealthDCAT-AP, CSVW, domain ontologies)
    └── Distribution
        ├── dct:conformsTo → Distribution schema (JSON Schema, XSD, etc.)
        ├── dcat:mediaType → Media type of source data
        └── DataService
            ├── endpointURL → DSP API endpoint
            ├── endpointDescription → dspace:connector
            ├── dspace:dataPlaneType → IRI indicating data plane type
```

## Component Details

### Catalog

The Catalog represents a collection of datasets and data services offered by a participant in the data space. It serves as the top-level container for all discoverable resources.

**Key Properties:**
- `dcat:dataset` - References to datasets in the catalog
- `dcat:service` - References to data services (typically the DSP API)
- `dspace:participantId` - Identifier of the participant offering this catalog
- `dct:publisher` - Publisher of the catalog

### DataService (Catalog Level)

The catalog-level DataService represents the DSP API endpoint that provides access to the catalog and facilitates data space protocol interactions.

**Key Properties:**
- `dcat:endpointURL` - URL of the DSP API
- `dcat:endpointDescription` - Description of the service (typically references dspace:connector). This reference is used to automatically link the DSP Data Service to new datasets.
### Dataset

A Dataset represents a logical collection of data that can be accessed through one or more distributions. Datasets can conform to various standards, ontologies, or legislation.

#### Dataset Creation in HTTP Data Plane

In the HTTP Data Plane, datasets are created through configuration (Helm values) or dynamically via the user interface. The data plane translates configuration into DCAT-compliant dataset metadata that is registered with the Control Plane.

**Configuration-based Creation:**

Datasets are defined in the HTTP Data Plane configuration (e.g., `values.http-data-plane.yaml`) using either simple or versioned types:

```yaml
dataset:
  type: versioned
  title: Patient Demographics API
  baseSemanticModelRef: https://vocabulary-hub.eu/ontology/demographics
  currentVersion: 2.1.0
  versions:
    - version: 2.1.0
      semanticModelRef: https://vocabulary-hub.eu/ontology/demographics/v2.1
      distributions:
        - backendUrl: https://api.example.org/patients
          openApiSpecRef: https://api.example.org/openapi.json
          mediaType: application/json
          schemaRef: https://example.org/schemas/patient.schema.json
```

The HTTP Data Plane transforms this configuration into a DCAT dataset with:
- Base dataset properties (title, conformsTo from semantic model references)
- Distribution with `dcat:accessService` pointing to the DSP API endpoint
- `dcat:format` set to `tsg:http` to indicate HTTP-based access
- OpenAPI specification referenced for technical description
- Proper version linking if using versioned type

**UI-based Creation:**

Users can also create and modify datasets through the HTTP Data Plane UI, which provides forms for entering dataset metadata and automatically generates valid DCAT structures.

#### Dataset Creation in Analytics Data Plane

In the Analytics Data Plane, datasets are created when users upload files through the web interface. The data plane automatically generates rich DCAT metadata by analyzing the uploaded data.

**Automated Metadata Generation:**

When a CSV file is uploaded, the Analytics Data Plane performs:

1. **Deterministic Analysis:**
   - Column data types detection (string, integer, float, date, boolean)
   - Statistical profiling (min/max values, unique counts, null percentages)
   - Pattern detection (email addresses, phone numbers, medical codes)
   - Temporal coverage extraction from date columns
   - Data quality metrics (completeness, consistency)

2. **LLM-Enhanced Metadata (optional):**
   - Semantic title and description generation
   - Keyword extraction for discovery
   - Theme classification (using DCAT and HealthDCAT-AP themes)
   - Column-level semantic annotations

3. **DCAT Dataset Creation:**
   - Generates comprehensive dataset metadata including CSVW table schema
   - Creates distribution with `dcat:format` set to `tsg:analytics`
   - Includes HealthDCAT-AP extensions for health data (age ranges, coding systems)
   - Embeds data quality measurements using DQV (Data Quality Vocabulary)
   - References CSVW for column-level metadata (variable dictionary)

The resulting dataset includes rich semantic metadata aligned with DCAT 3, HealthDCAT-AP, and CSVW standards, enabling fine-grained discovery and understanding of the data without exposing the actual content.

**Example Generated Properties:**
- `healthdcatap:numberOfRecords` - Row count
- `healthdcatap:hasCodingSystem` - Detected medical coding systems (ICD-10, LOINC, etc.)
- `dqv:hasQualityMeasurement` - Completeness and validity metrics
- `csvw:tableSchema` - Full variable dictionary with semantic annotations

#### Domain Extensions

For health data, datasets may include HealthDCAT-AP properties:
- `healthdcatap:numberOfRecords` - Number of records in the dataset
- `healthdcatap:minTypicalAge` - Minimum typical age of subjects
- `healthdcatap:maxTypicalAge` - Maximum typical age of subjects
- `healthdcatap:hasCodingSystem` - Medical coding systems used

### Distribution

A Distribution represents a specific available format or access mechanism for a dataset. Each distribution can have its own schema, media type, and access service.

**Key Properties:**
- `dct:title` - Title of this specific distribution
- `dct:conformsTo` - Schema or standard for this distribution
  - Examples: JSON Schema, XML Schema (XSD), Avro Schema
- `dcat:mediaType` - IANA media type of the data
  - Examples: `text/csv`, `application/json`, `application/parquet`
- `dcat:format` - Format identifier (may be different from mediaType)
- `dcat:byteSize` - Size of the distribution in bytes
- `dcat:accessService` - Reference to the DataService providing access

### DataService (Distribution Level)

The distribution-level DataService describes how to access a specific distribution, including the data plane endpoint and any technical descriptions.

**Key Properties:**
- `dcat:endpointURL` - URL of the DSP API (for transfer negotiation)
- `dcat:endpointDescription` - Type of connector (typically `dspace:connector`)


## Dataset Versioning

DCAT provides multiple properties to manage dataset versions, allowing participants to track evolution of datasets over time and maintain relationships between different versions.

### Version Properties

DCAT defines several properties for version management:

- `dcat:version` - A version number or identifier (e.g., "1.0", "2.3.1", "2024-01-15")
- `dcat:hasVersion` - Links to other versions of this dataset (can be multiple)
- `dcat:isVersionOf` - Points to the parent/base dataset that this is a version of
- `dcat:hasCurrentVersion` - Points to the current/latest version
- `dcat:previousVersion` - Points to the immediately preceding version


### Versioning in TSG

The HTTP Data Plane in TSG supports versioning through the `type: versioned` configuration:

```yaml
dataset:
  type: versioned
  title: Patient Demographics API
  currentVersion: 2.1.0
  versions:
    - version: 1.0.0
      distributions:
        - backendUrl: https://api.example.org/v1/patients
    - version: 2.0.0
      distributions:
        - backendUrl: https://api.example.org/v2/patients
    - version: 2.1.0
      distributions:
        - backendUrl: https://api.example.org/v2.1/patients
```

This configuration creates:
- A base dataset with `dcat:hasCurrentVersion` pointing to version 2.1.0
- Separate dataset resources for each version with appropriate version linking
- Distribution-level versioning for API endpoints

### Versioning Best Practices

1. **Semantic Versioning**: Use semantic versioning (MAJOR.MINOR.PATCH) for APIs and data schemas
2. **Date-based Versioning**: Use ISO 8601 dates (YYYY-MM-DD) for time-series data or periodic releases
3. **Breaking Changes**: Increment major version when making breaking changes to schema or semantics

### Schema Versioning

When versioning datasets, also version the conformance schemas:

```json
{
  "@type": "Dataset",
  "@id": "https://example.org/datasets/research-data/v2.0.0",
  "dcat:version": "2.0.0",
  "distribution": [
    {
      "@type": "Distribution",
      "conformsTo": "https://example.org/schemas/research-v2.schema.json",
      "mediaType": "application/json"
    }
  ]
}
```

This ensures consumers can validate data against the correct schema version and understand structural changes between versions.

## Implementation Examples

### HTTP Data Plane Dataset

```json
{
  "@type": "Dataset",
  "@id": "https://example.org/datasets/patient-data",
  "title": "Patient Demographics",
  "description": "Anonymized patient demographic data",
  "conformsTo": [
    "https://healthdataeu.pages.code.europa.eu/healthdcat-ap/",
    "https://example.org/ontology/demographics-v1"
  ],
  "distribution": [
    {
      "@type": "Distribution",
      "title": "JSON API Distribution",
      "conformsTo": "https://example.org/schemas/patient-schema.json",
      "mediaType": "application/json",
      "accessService": {
        "@type": "DataService",
        "endpointURL": "https://connector.example.org/api/dsp",
        "endpointDescription": "dspace:connector",
        "dataPlaneType": "tsg:http",
      }
    }
  ]
}
```

### Analytics Data Plane Dataset

```json
{
  "@type": "Dataset",
  "@id": "https://example.org/datasets/medical-records",
  "title": "Medical Records for Analysis",
  "description": "Encrypted medical records for federated analytics",
  "conformsTo": [
    "https://healthdataeu.pages.code.europa.eu/healthdcat-ap/"
  ],
  "distribution": [
    {
      "@type": "Distribution",
      "title": "CSV Distribution",
      "conformsTo": "https://www.w3.org/TR/tabular-metadata/",
      "mediaType": "text/csv",
      "format": "tsg:analytics",
      "accessService": {
        "@type": "DataService",
        "endpointURL": "https://connector.example.org/api/dsp",
        "endpointDescription": "dspace:connector",
        "dataPlaneType": "tsg:analytics"
      }
    }
  ]
}
```

## Custom DCAT Properties (Application Profiles)

The TSG HTTP data plane supports adding custom DCAT properties to datasets through the `extraProps` configuration field. This enables compliance with domain-specific application profiles such as [GeoDCAT-AP](https://semiceu.github.io/GeoDCAT-AP/) for geospatial data and [HealthDCAT-AP](https://healthdataeu.pages.code.europa.eu/healthdcat-ap/) for health data.

Custom properties defined in `extraProps` are merged directly into the serialized DCAT dataset. This means any valid JSON-LD property can be included in the dataset metadata without modifying the core data model.

The following namespace prefixes are available:

| Source Context | Available Prefixes |
|---|---|
| DSP | `dcat`, `dct`, `odrl`, `dspace`, `xsd` |
| TSG | `tsg`, `iana`, `csvw`, `dqv`, `dcatap`, `sdmx` |
| HealthDCAT-AP | `healthdcatap`, `prov`, `heracles`, `ldp`, `fdp-o` |

Using other namespaces require the keys to be expanded to their full IRI form (e.g., `http://www.w3.org/ns/dcat#spatial` instead of `dcat:spatial`) since prefixes not defined in the default contexts will be rejected during validation.

### How it works

The `extraProps` field accepts a `Record<string, unknown>` — a key-value map where keys are namespaced property names (e.g., `healthdcatap:numberOfRecords`) and values can be primitives, objects, or arrays following JSON-LD conventions.

For **collection datasets**, properties are merged from two levels:
1. **Config-level** `extraProps` — base properties for all items in the collection
2. **Item-level** `extraProps` — per-item properties that override config-level ones

For **versioned datasets**, `extraProps` are set on the base dataset entry.

### GeoDCAT-AP Example

[GeoDCAT-AP](https://semiceu.github.io/GeoDCAT-AP/) extends DCAT-AP with geospatial metadata. Properties using prefixes available in the default contexts include:

| Property | Description |
|---|---|
| `dct:spatial` | Geographic coverage as a location or geometry |
| `dcat:spatialResolutionInMeters` | Spatial resolution of the dataset |
| `dcat:temporalResolution` | Temporal resolution (ISO 8601 duration) |

```json
{
  "@type": "Dataset",
  "@id": "urn:uuid:geo-roads",
  "title": "National Road Infrastructure",
  "conformsTo": "https://semiceu.github.io/GeoDCAT-AP/",
  "dct:spatial": "POLYGON((3.37 50.75, 3.37 53.47, 7.21 53.47, 7.21 50.75, 3.37 50.75))",
  "dcat:spatialResolutionInMeters": 10.0,
  "dcat:temporalResolution": "P1D",
  "distribution": [...]
}
```

:::note
Some GeoDCAT-AP properties use prefixes like `geodcat:`, `locn:`, `gsp:`, or `foaf:` that are not defined in the default JSON-LD contexts. To use these prefixes, the corresponding contexts must first be registered in the system. Properties with unknown prefixes will be rejected during validation.
:::


### HealthDCAT-AP Example

[HealthDCAT-AP](https://healthdataeu.pages.code.europa.eu/healthdcat-ap/) extends DCAT-AP for health data. Typical properties include:

| Property | Description |
|---|---|
| `healthdcatap:numberOfRecords` | Number of records in the dataset |
| `healthdcatap:minTypicalAge` | Minimum typical age of subjects |
| `healthdcatap:maxTypicalAge` | Maximum typical age of subjects |
| `healthdcatap:populationCoverage` | Geographic scope of the population |

```json
{
  "@type": "Dataset",
  "@id": "urn:uuid:health-trials",
  "title": "Clinical Trial Registry",
  "conformsTo": "https://healthdataeu.pages.code.europa.eu/healthdcat-ap/",
  "healthdcatap:numberOfRecords": 50000,
  "healthdcatap:minTypicalAge": 18,
  "healthdcatap:maxTypicalAge": 90,
  "healthdcatap:populationCoverage": "National",
  "distribution": [...]
}
```
```

For configuration examples, see the [Dataset Configuration](../deployment/dataset.md#custom-dcat-properties-extraprops) documentation.

## Conformance References

### Dataset Level (`dct:conformsTo`)

At the dataset level, `dct:conformsTo` typically references:

- **Application Profiles**: HealthDCAT-AP, DCAT-AP
- **Domain Ontologies**: Medical terminologies, industry standards
- **Legislation**: GDPR, HIPAA, domain-specific regulations
- **Metadata Standards**: CSVW for tabular data

### Distribution Level (`dct:conformsTo`)

At the distribution level, `dct:conformsTo` typically references:

- **Data Schemas**: JSON Schema, XML Schema (XSD), Avro Schema
- **Table Schemas**: CSVW Table Schema for CSV files
- **API Specifications**: OpenAPI specification

## Best Practices

### Choosing Conformance References

1. **Dataset conformsTo**: Use for high-level semantic models, application profiles, and regulatory frameworks
2. **Distribution conformsTo**: Use for technical schemas that validate the data format

### Media Type Selection

- Use standard IANA media types whenever possible
- For file-based resources, `dcat:mediaType` indicates the file format
- For API-based resources, consider whether mediaType represents:
  - The format of API responses
  - The format of the underlying data source
  - Both (if they align)

### Multiple Distributions

Provide multiple distributions when:
- Data is available in multiple formats (CSV, JSON, Parquet)
- Different access patterns are supported (API vs. file download)
- Different data plane types can access the same dataset
- Different conformance levels or schemas apply to different views

## Related Standards

- [DCAT 3](https://www.w3.org/TR/vocab-dcat-3/) - Data Catalog Vocabulary
- [GeoDCAT-AP](https://semiceu.github.io/GeoDCAT-AP/) - Geospatial Data Application Profile
- [HealthDCAT-AP](https://healthdataeu.pages.code.europa.eu/healthdcat-ap/) - Health Data Application Profile
- [CSVW](https://www.w3.org/TR/tabular-metadata/) - CSV on the Web
- [Eclipse Dataspace Protocol](https://eclipse-dataspace-protocol-base.github.io/DataspaceProtocol/) - Data space interactions
- [Dublin Core Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/) - Metadata vocabulary

---

**Next**: Learn about [Design Decisions](./design-decisions.md) or return to [Standards and Protocols](./standards-protocols.md).
