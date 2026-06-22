export enum SemanticObservabilityDimension {
  ADOPTION = "adoption",
  FRICTION = "friction",
  EVOLUTION = "evolution",
  STABILITY = "stability"
}

export enum SemanticObservabilityStatus {
  INFO = "info",
  SUCCESS = "success",
  FAILURE = "failure",
  WARNING = "warning"
}

export enum SemanticObservabilityComponent {
  CONTROL_PLANE = "control-plane",
  HTTP_DATA_PLANE = "http-data-plane",
  ANALYTICS_DATA_PLANE = "analytics-data-plane",
  WALLET = "wallet",
  AUDIT = "audit",
  LOCAL_VALIDATOR = "local-validator"
}

export enum SemanticObservabilityEventType {
  CATALOG_METADATA_OBSERVED = "catalog.metadata.observed",
  DATASET_CONFIGURATION_OBSERVED = "dataset.configuration.observed",
  DATASET_METADATA_CHANGED = "dataset.metadata.changed",
  SEMANTIC_ARTEFACT_OBSERVED = "semantic-artefact.observed",
  METADATA_VALIDATION_RESULT = "metadata.validation.result",
  POLICY_EVALUATION_RESULT = "policy.evaluation.result",
  NEGOTIATION_STATE_CHANGED = "negotiation.state.changed",
  TRANSFER_STATE_CHANGED = "transfer.state.changed",
  DATA_PLANE_ACCESS_OBSERVED = "data-plane.access.observed",
  AUDIT_DECISION_OBSERVED = "audit.decision.observed"
}

export enum SemanticArtefactType {
  SEMANTIC_MODEL = "semantic-model",
  BASE_SEMANTIC_MODEL = "base-semantic-model",
  ONTOLOGY = "ontology",
  VOCABULARY = "vocabulary",
  SCHEMA = "schema",
  OPENAPI_SPEC = "openapi-spec",
  DCAT_PROFILE = "dcat-profile",
  CSVW_METADATA = "csvw-metadata",
  DQV_MEASUREMENT = "dqv-measurement",
  POLICY_PROFILE = "policy-profile",
  VALIDATION_RULE = "validation-rule",
  MAPPING = "mapping",
  UNKNOWN = "unknown"
}

export enum SemanticObservabilityMetricName {
  SEMANTIC_MODEL_COVERAGE = "semantic_model_coverage",
  SCHEMA_REFERENCE_COVERAGE = "schema_reference_coverage",
  METADATA_COMPLETENESS_SCORE = "metadata_completeness_score",
  VALIDATION_ERROR_RATE = "validation_error_rate",
  POLICY_FAILURE_COUNT = "policy_failure_count",
  NEGOTIATION_SUCCESS_RATE = "negotiation_success_rate",
  NEGOTIATION_FAILURE_RATE = "negotiation_failure_rate",
  TRANSFER_SUCCESS_RATE = "transfer_success_rate",
  TRANSFER_FAILURE_RATE = "transfer_failure_rate",
  DATA_PLANE_ACCESS_SUCCESS_RATE = "data_plane_access_success_rate",
  DATA_PLANE_ACCESS_FAILURE_RATE = "data_plane_access_failure_rate",
  AUDIT_DENIAL_RATE = "audit_denial_rate",
  AVERAGE_TRANSFER_SETUP_LATENCY = "average_transfer_setup_latency",
  ARTEFACT_VERSION_ADOPTION_RATE = "artefact_version_adoption_rate",
  DEPRECATED_ARTEFACT_USAGE_RATE = "deprecated_artefact_usage_rate"
}
