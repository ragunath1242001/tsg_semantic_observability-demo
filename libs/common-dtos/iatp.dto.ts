export interface PresentationDefinition {
  id: string;
  input_descriptors: InputDescriptor[];
  name?: string;
  purpose?: string;
  format?: Format;
}

export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  format?: Format;
  constraints: Constraint;
}

export interface Format {
  jwt_vp?: {
    alg: string[];
  };
}

export interface Constraint {
  fields?: Field[];
  limit_disclosure?: "required" | "preferred";
}

export interface Field {
  path: string[];
  id?: string;
  purpose?: string;
  name?: string;
  filter?: Filter;
  optional?: boolean;
}

export interface Filter extends FilterItems {
  type: string;
}

export interface FilterItems {
  const?: number | string;
  enum?: Array<number | string>;
  exclusiveMinimum?: number | string;
  exclusiveMaximum?: number | string;
  format?: string;
  formatMaximum?: string;
  formatMinimum?: string;
  formatExclusiveMaximum?: string;
  formatExclusiveMinimum?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number | string;
  maximum?: number | string;
  not?: FilterItems;
  pattern?: string;
  contains?: FilterItems;
  items?: Record<string, Filter>;
}

export interface PresentationResponse {
  vp_token: string;
  presentation_submission: PresentationSubmission;
}

export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMap[];
}

export interface DescriptorMap {
  id: string;
  format: string;
  path: string;
  path_nested?: DescriptorMap;
}
