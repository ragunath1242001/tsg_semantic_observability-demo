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

The properties in this yaml file are translated to [DCAT](https://www.w3.org/TR/vocab-dcat-3/) Datasets. The properties that are configurable can be found in [HTTP Data Plane Configuration](../apps/http-data-plane/configuration.md). 

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