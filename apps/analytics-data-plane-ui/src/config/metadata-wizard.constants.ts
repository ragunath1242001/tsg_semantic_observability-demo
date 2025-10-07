export interface OptionItem {
  label: string;
  value: string;
}

export interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  optional?: boolean;
}

export const POPULATION_COVERAGE_OPTIONS: OptionItem[] = [
  { label: "Less than 80%: Limited coverage", value: "<80>" },
  { label: "80-90%: Good coverage", value: "80-90" },
  { label: "90-95%: Very good coverage", value: "90-95" },
  { label: "95-100%: (Near) universal coverage", value: "95-100" }
];

export const POPULATION_COVERAGE_EXTENDED_OPTIONS: OptionItem[] = [
  { label: "No information on sampling", value: "no-info" },
  {
    label:
      "Sampling information does not represent the sample representativity",
    value: "not-representative"
  },
  {
    label: "Sampling information demonstrates the sample representativity",
    value: "representative"
  },
  { label: "Dataset contains all expected population", value: "all-population" }
];

export const DATA_QUALITY_CONFIG: Record<string, OptionItem[]> = {
  accuracy: [
    { label: "Accuracy not documented", value: "not-documented" },
    {
      label:
        "Information on the efforts to ensure accuracy is provided (non statistical information provided)",
      value: "efforts-documented"
    },
    {
      label:
        "Statistical information on accuracy is provided at variable and/or individual level",
      value: "statistical-documented"
    }
  ],
  coherence: [
    { label: "Coherence not documented", value: "not-documented" },
    { label: "Coherence documented for some entities", value: "some-entities" },
    {
      label: "Attributes and relations in the dataset",
      value: "attributes-relations"
    },
    {
      label:
        "Coherence documented for all entities, attributes and relations in the dataset",
      value: "all-documented"
    }
  ],
  completeness: [
    { label: "Completeness not documented", value: "not-documented" },
    {
      label: "Some variables are analysed for completeness",
      value: "some-variables"
    },
    {
      label: "All variables are analysed for completeness",
      value: "all-variables"
    }
  ],
  consistency: [
    { label: "Consistency not documented", value: "not-documented" },
    {
      label: "Consistency of some variables is documented",
      value: "some-variables"
    },
    {
      label: "Consistency of all variables is documented",
      value: "all-variables"
    }
  ],
  precision: [
    { label: "Precision not documented", value: "not-documented" },
    {
      label: "Precision of some variables is documented",
      value: "some-variables"
    },
    {
      label: "Precision of all variables is documented",
      value: "all-variables"
    }
  ],
  validity: [
    { label: "No report available", value: "no-report" },
    {
      label: "Report available for validity of some variables",
      value: "some-variables"
    },
    {
      label: "Report available for validity of all variables",
      value: "all-variables"
    }
  ]
};

export const LEGAL_COMPLIANCE_OPTIONS: OptionItem[] = [
  { label: "No", value: "no" },
  {
    label:
      "Documentation of applicable ethical standards conventions protocols or regulations but no documentation of deviation on compliance",
    value: "ethical-standards"
  },
  {
    label:
      "Documentation of applicable ethical standards conventions protocols or regulation as well as documentation on deviations or compliance",
    value: "ethical-standards-compliance"
  }
];

export const DATA_PROVENANCE_OPTIONS: OptionItem[] = [
  {
    label: "No documentation on data processes and operations",
    value: "no"
  },
  {
    label:
      "Documentation on data processes and operations but not complying with PROV-O standards",
    value: "external-party"
  },
  {
    label:
      "Documentation on data processes and operations complying with PROV-O standards",
    value: "data-controller"
  }
];

export const WIZARD_STEPS: StepConfig[] = [
  {
    id: "1",
    title: "Basics",
    description: "Essential metadata about your dataset",
    icon: "pi pi-info-circle"
  },
  {
    id: "2",
    title: "Health & Research",
    description: "Health-specific metadata and research context",
    icon: "pi pi-heart",
    optional: true
  },
  {
    id: "3",
    title: "Data Quality",
    description: "Quality annotations and measurements",
    icon: "pi pi-shield",
    optional: true
  },
  {
    id: "4",
    title: "Distribution & Access",
    description: "Data access, policies, and distributions",
    icon: "pi pi-share-alt"
  },
  {
    id: "5",
    title: "Legal & Compliance",
    description: "Legal basis, processes, and compliance",
    icon: "pi pi-check-square"
  },
  {
    id: "6",
    title: "Review & Complete",
    description: "Final review and dataset creation",
    icon: "pi pi-check-circle"
  }
];

export const DEFAULT_CONTEXTS = [
  "https://w3id.org/dspace/2025/1/context.jsonld",
  "https://tsg.dataspac.es/contexts/v0.11.0/tsg.json",
  "https://tsg.dataspac.es/contexts/v0.11.0/health.json"
];

export type DataQualityDimension = keyof typeof DATA_QUALITY_CONFIG;

export function getDataQualityOptions(
  dimension: DataQualityDimension
): OptionItem[] {
  return DATA_QUALITY_CONFIG[dimension];
}

export function findOptionLabel(options: OptionItem[], value: string): string {
  return options.find((option) => option.value === value)?.label || value;
}
