# Dataset Configuration Documentation

If you are participating in a data space, it is useful to advertise the datasets and services you are offering. This can be done by configuring the right datasets for each service you offer with the HTTP Data Plane. 

Presuming you followed the steps in the [technical deployment documentation](./README.md), we assume you have a `values.http-data-plane.yaml` that looks similar to the following yaml snippet:

```yaml 
dataset:
    type: versioned
    title: Test Service HTTPBin A
    currentVersion: 0.9.2
    versions:
      - version: 0.9.2
        distributions:
          - backendUrl: https://mockhttp.org/
            openApiSpecRef: https://mockhttp.org/docs/json
```

The properties in this yaml file are translated to [DCAT](https://www.w3.org/TR/vocab-dcat-3/) Datasets. More information on how the DCAT structure looks like in the TSG can be found in [DCAT Structure](../architecture/dcat-structure.md). The properties that are configurable can be found in [HTTP Data Plane Configuration](../apps/http-data-plane/configuration.md). 

## Open API Specification
Most properties in the dataset described above are direct links to the similar named DCAT properties. This is not the case for `backendUrl` and `openApiSpecRef`. The `backendUrl` property points towards your backend service and is used for finding the application when a Transfer is started, according to the Dataspace Protocol. This `backendUrl` is accompanied by the `openApiSpecRef`, to indicate to what OpenAPI Specification describes your API. This greatly helps future clients determine what use your service can give to them.

## Vocabulary Hub integration

To strive towards Semantic Interoperability, you can refer to agreed upon standards within the dataset configuration. Within data spaces, value added services like a vocabulary hub (e.g. [Semantic Treehouse](https://www.semantic-treehouse.nl/)) can help future consumers to identify whether your dataset or service is of use to them. The above dataset that is defined in `values.http-data-plane.yaml`, can be altered to point towards specific ontologies or data models defined in a vocabulary hub as follows:

```yaml
dataset:
    type: versioned
    title: Test Service HTTPBin A
    baseSemanticModelRef: https://vocabulary-hub.eu/ontology/ontology-123
    currentVersion: 0.9.2
    versions:
      - version: 0.9.2
        semanticModelRef: https://vocabulary-hub.eu/ontology/ontology-123/version/0.9.2
        distributions:
          - backendUrl: https://mockhttp.org/
            openApiSpecRef: https://mockhttp.org/docs/json
```

Note the `baseSemanticModelRef` and `semanticModelRef` properties are added. These properties are used to indicate to what semantic model representation your specific version adheres to. 

After deploying the configuration, changes can be made in the User Interface of the HTTP Data Plane or the components could be redeployed using new configuration.

## Custom DCAT Properties (extraProps)

For domain-specific use cases, you may want to add additional DCAT properties to your datasets beyond the standard ones. The `extraProps` field allows you to include any custom properties that will be merged into the DCAT dataset metadata. This is useful for supporting application profiles such as [GeoDCAT-AP](https://semiceu.github.io/GeoDCAT-AP/) or [HealthDCAT-AP](https://healthdataeu.pages.code.europa.eu/healthdcat-ap/).

The `extraProps` field is available on:
- **Versioned dataset configuration** (`dataset.extraProps`) — applies to the base dataset
- **Collection dataset configuration** (`dataset.extraProps`) — applies as a base to all items
- **Dataset items** (`extraProps` per item) — per-item properties that override config-level ones
- **Dataset versions** (`extraProps` per version) — per-version properties that override dataset-level ones

### Prefix Validation

When `extraProps` are configured, the HTTP Data Plane validates that all namespaced property keys use prefixes that are defined in the loaded JSON-LD contexts. This ensures that properties are not silently dropped during JSON-LD compaction.

The following namespace prefixes are available by default:

| Source Context | Available Prefixes |
|---|---|
| DSP | `dcat`, `dct`, `odrl`, `dspace`, `xsd` |
| TSG | `tsg`, `iana`, `csvw`, `dqv`, `dcatap`, `sdmx` |
| HealthDCAT-AP | `healthdcatap`, `prov`, `heracles`, `ldp`, `fdp-o` |

If you use a prefix that is not in the table above (e.g., `geodcat:`, `foaf:`, `skos:`), the dataset creation will fail with a validation error listing the unknown prefixes. To use keys in such scenarios, expand the key to its full IRI form (e.g., `http://www.w3.org/ns/dcat#spatial` instead of `dcat:spatial`).

### GeoDCAT-AP Example

For geospatial datasets, you can use standard DCAT properties for spatial coverage and resolution. Note that only prefixes defined in the JSON-LD contexts can be used:

```yaml
dataset:
  type: versioned
  title: National Road Infrastructure
  baseSemanticModelRef: https://semiceu.github.io/GeoDCAT-AP/
  currentVersion: 1.0.0
  extraProps:
    dct:spatial: "POLYGON((3.37 50.75, 3.37 53.47, 7.21 53.47, 7.21 50.75, 3.37 50.75))"
    dcat:spatialResolutionInMeters: 10.0
    dcat:temporalResolution: P1D
  versions:
    - version: 1.0.0
      distributions:
        - backendUrl: https://api.example.org/geo/roads
          mediaType: application/geo+json
```

### HealthDCAT-AP Example

For health data sharing scenarios using the HealthDCAT-AP profile, you can describe population characteristics:

```yaml
dataset:
  type: versioned
  title: Clinical Trial Registry
  baseSemanticModelRef: https://healthdataeu.pages.code.europa.eu/healthdcat-ap/
  currentVersion: 2.0.0
  extraProps:
    healthdcatap:numberOfRecords: 50000
    healthdcatap:minTypicalAge: 18
    healthdcatap:maxTypicalAge: 90
    healthdcatap:populationCoverage: National
  versions:
    - version: 2.0.0
      distributions:
        - backendUrl: https://api.example.org/health/trials
          mediaType: application/json
```

### Granularity of extraProps

For versioned datasets, you can set base extra properties at the dataset level and override or extend them per version. Version-level `extraProps` take precedence over dataset-level ones:

```yaml
dataset:
  type: versioned
  title: National Road Infrastructure
  baseSemanticModelRef: https://semiceu.github.io/GeoDCAT-AP/
  currentVersion: 2.0.0
  extraProps:
    dct:spatial: "POLYGON((3.37 50.75, 3.37 53.47, 7.21 53.47, 7.21 50.75, 3.37 50.75))"
    dcat:temporalResolution: P1D
    dcat:spatialResolutionInMeters: 25.0
  versions:
    - version: 1.0.0
      distributions:
        - backendUrl: https://api.example.org/geo/roads
          mediaType: application/geo+json
    - version: 2.0.0
      extraProps:
        dcat:spatialResolutionInMeters: 10.0
      distributions:
        - backendUrl: https://api.example.org/geo/roads
          mediaType: application/geo+json
```

In this example, both versions inherit `dct:spatial` and `dcat:temporalResolution` from the dataset config, and the first version inherits `dcat:spatialResolutionInMeters` from the dataset config while the second version overrides it with its own value.

For collection datasets, you can set base extra properties at the config level and override or extend them per item. Item-level `extraProps` take precedence over config-level ones:

```yaml
dataset:
  type: collection
  extraProps:
    dct:spatial: Netherlands

initCollection:
  - id: "urn:dataset:geo-roads"
    title: Road Network Data
    version: v1
    backendUrl: https://api.example.org/geo/roads
    mediaType: application/geo+json
    extraProps:
      dcat:spatialResolutionInMeters: 5.0
  - id: "urn:dataset:geo-buildings"
    title: Building Registry
    version: v1
    backendUrl: https://api.example.org/geo/buildings
    mediaType: application/geo+json
    extraProps:
      dcat:spatialResolutionInMeters: 1.0
```

In this example, both items inherit `dct:spatial` from the collection config, while each item has its own `dcat:spatialResolutionInMeters`.