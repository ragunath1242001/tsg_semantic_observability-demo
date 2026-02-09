import type { OpenAPIObject } from "@nestjs/swagger";

export function parseAndDereferenceOpenApiSpec(
  spec: unknown
): DereferencedOpenAPIObject {
  if (typeof spec !== "object" || spec === null) {
    throw new Error("Invalid OpenAPI spec: expected an object");
  }

  const openApiSpec = spec as OpenAPIObject;

  if (!openApiSpec.info || !openApiSpec.paths) {
    throw new Error(
      "Invalid OpenAPI spec: missing required fields (info, paths)"
    );
  }

  const dereferencer = new OpenApiDereferencer(openApiSpec);
  return dereferencer.dereference();
}

// ============================================================================
// Parser Implementation
// ============================================================================

function isReferenceObject(obj: unknown): obj is ReferenceObject {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "$ref" in obj &&
    typeof (obj as ReferenceObject).$ref === "string"
  );
}

function resolveRefPath(ref: string): string[] {
  // Expected format: "#/components/schemas/MySchema"
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported reference format: ${ref}`);
  }
  return ref.slice(2).split("/");
}

function getRefTarget(spec: OpenAPIObject, refPath: string[]): unknown {
  let current: unknown = spec;
  for (const segment of refPath) {
    if (typeof current !== "object" || current === null) {
      throw new Error(`Invalid reference path: ${refPath.join("/")}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

class OpenApiDereferencer {
  private readonly spec: OpenAPIObject;
  private readonly cache = new Map<string, unknown>();
  private readonly resolving = new Set<string>();

  constructor(spec: OpenAPIObject) {
    this.spec = spec;
  }

  dereference(): DereferencedOpenAPIObject {
    // Pre-populate cache with component schemas to handle circular references
    this.preCacheComponents();

    return {
      ...this.spec,
      paths: this.dereferencePaths(this.spec.paths),
      components: this.spec.components
        ? this.dereferenceComponents(this.spec.components)
        : undefined
    };
  }

  private preCacheComponents(): void {
    if (!this.spec.components) return;

    // Pre-cache empty objects for all schemas to handle circular references
    if (this.spec.components.schemas) {
      for (const [name, _schema] of Object.entries(
        this.spec.components.schemas
      )) {
        const ref = `#/components/schemas/${name}`;
        if (!this.cache.has(ref)) {
          // Create placeholder that will be filled during dereferencing
          this.cache.set(ref, {});
        }
      }
    }
  }

  private resolveRef<T>(ref: string, derefFn: (value: unknown) => T): T {
    // Check if already cached (including pre-cached placeholders)
    if (this.cache.has(ref)) {
      const cached = this.cache.get(ref) as T;
      // If it's a placeholder (empty object) and we're not currently resolving it,
      // we need to fill it in
      if (
        !this.resolving.has(ref) &&
        typeof cached === "object" &&
        cached !== null &&
        Object.keys(cached).length === 0
      ) {
        // Fill in the placeholder
        this.resolving.add(ref);
        try {
          const refPath = resolveRefPath(ref);
          const target = getRefTarget(this.spec, refPath);
          const dereferenced = derefFn(target);
          // Update the cached placeholder with actual values
          Object.assign(cached, dereferenced);
          return cached;
        } finally {
          this.resolving.delete(ref);
        }
      }
      return cached;
    }

    // Check for circular reference (already resolving this ref)
    if (this.resolving.has(ref)) {
      // Return a placeholder object for circular references
      // The placeholder will be filled in when the reference is fully resolved
      const placeholder = {} as T;
      this.cache.set(ref, placeholder);
      return placeholder;
    }

    this.resolving.add(ref);
    try {
      const refPath = resolveRefPath(ref);
      const target = getRefTarget(this.spec, refPath);
      const dereferenced = derefFn(target);
      this.cache.set(ref, dereferenced);
      return dereferenced;
    } finally {
      this.resolving.delete(ref);
    }
  }

  private dereferenceSchema(
    schema: SchemaObject | ReferenceObject | undefined
  ): DereferencedSchemaObject | undefined {
    if (!schema) return undefined;

    if (isReferenceObject(schema)) {
      return this.resolveRef(schema.$ref, (target) =>
        this.dereferenceSchema(target as SchemaObject | ReferenceObject)
      );
    }

    // Destructure to exclude properties that need dereferencing
    const {
      allOf,
      oneOf,
      anyOf,
      not,
      items,
      properties,
      additionalProperties,
      patternProperties: _patternProperties,
      ...rest
    } = schema;

    const result: DereferencedSchemaObject = { ...rest };

    if (allOf) {
      result.allOf = allOf
        .map((s) => this.dereferenceSchema(s))
        .filter((s): s is DereferencedSchemaObject => s !== undefined);
    }
    if (oneOf) {
      result.oneOf = oneOf
        .map((s) => this.dereferenceSchema(s))
        .filter((s): s is DereferencedSchemaObject => s !== undefined);
    }
    if (anyOf) {
      result.anyOf = anyOf
        .map((s) => this.dereferenceSchema(s))
        .filter((s): s is DereferencedSchemaObject => s !== undefined);
    }
    if (not) {
      result.not = this.dereferenceSchema(not);
    }
    if (items) {
      result.items = this.dereferenceSchema(items);
    }
    if (properties) {
      result.properties = Object.fromEntries(
        Object.entries(properties)
          .map(([key, value]) => [key, this.dereferenceSchema(value)])
          .filter(
            (entry): entry is [string, DereferencedSchemaObject] =>
              entry[1] !== undefined
          )
      );
    }
    if (additionalProperties !== undefined) {
      if (typeof additionalProperties === "boolean") {
        result.additionalProperties = additionalProperties;
      } else {
        result.additionalProperties =
          this.dereferenceSchema(additionalProperties);
      }
    }

    return result;
  }

  private dereferenceExample(
    example: ExampleObject | ReferenceObject | undefined
  ): ExampleObject | undefined {
    if (!example) return undefined;

    if (isReferenceObject(example)) {
      return this.resolveRef(example.$ref, (target) =>
        this.dereferenceExample(target as ExampleObject | ReferenceObject)
      );
    }

    return example;
  }

  private dereferenceExamples(
    examples: Record<string, ExampleObject | ReferenceObject> | undefined
  ): Record<string, ExampleObject> | undefined {
    if (!examples) return undefined;

    return Object.fromEntries(
      Object.entries(examples)
        .map(([key, value]) => [key, this.dereferenceExample(value)])
        .filter(
          (entry): entry is [string, ExampleObject] => entry[1] !== undefined
        )
    );
  }

  private dereferenceHeader(
    header: HeaderObject | ReferenceObject | undefined
  ): DereferencedHeaderObject | undefined {
    if (!header) return undefined;

    if (isReferenceObject(header)) {
      return this.resolveRef(header.$ref, (target) =>
        this.dereferenceHeader(target as HeaderObject | ReferenceObject)
      );
    }

    return {
      ...header,
      schema: this.dereferenceSchema(header.schema),
      examples: this.dereferenceExamples(header.examples)
    };
  }

  private dereferenceHeaders(
    headers: Record<string, HeaderObject | ReferenceObject> | undefined
  ): Record<string, DereferencedHeaderObject> | undefined {
    if (!headers) return undefined;

    return Object.fromEntries(
      Object.entries(headers)
        .map(([key, value]) => [key, this.dereferenceHeader(value)])
        .filter(
          (entry): entry is [string, DereferencedHeaderObject] =>
            entry[1] !== undefined
        )
    );
  }

  private dereferenceMediaType(
    mediaType: MediaTypeObject | undefined
  ): DereferencedMediaTypeObject | undefined {
    if (!mediaType) return undefined;

    return {
      ...mediaType,
      schema: this.dereferenceSchema(mediaType.schema),
      examples: this.dereferenceExamples(mediaType.examples)
    };
  }

  private dereferenceContent(
    content: ContentObject | undefined
  ): DereferencedContentObject | undefined {
    if (!content) return undefined;

    return Object.fromEntries(
      Object.entries(content)
        .map(([key, value]) => [key, this.dereferenceMediaType(value)])
        .filter(
          (entry): entry is [string, DereferencedMediaTypeObject] =>
            entry[1] !== undefined
        )
    );
  }

  private dereferenceParameter(
    parameter: ParameterObject | ReferenceObject | undefined
  ): DereferencedParameterObject | undefined {
    if (!parameter) return undefined;

    if (isReferenceObject(parameter)) {
      return this.resolveRef(parameter.$ref, (target) =>
        this.dereferenceParameter(target as ParameterObject | ReferenceObject)
      );
    }

    return {
      ...parameter,
      schema: this.dereferenceSchema(parameter.schema),
      examples: this.dereferenceExamples(parameter.examples)
    };
  }

  private dereferenceParameters(
    parameters: (ParameterObject | ReferenceObject)[] | undefined
  ): DereferencedParameterObject[] | undefined {
    if (!parameters) return undefined;

    return parameters
      .map((p) => this.dereferenceParameter(p))
      .filter((p): p is DereferencedParameterObject => p !== undefined);
  }

  private dereferenceRequestBody(
    requestBody: RequestBodyObject | ReferenceObject | undefined
  ): DereferencedRequestBodyObject | undefined {
    if (!requestBody) return undefined;

    if (isReferenceObject(requestBody)) {
      return this.resolveRef(requestBody.$ref, (target) =>
        this.dereferenceRequestBody(
          target as RequestBodyObject | ReferenceObject
        )
      );
    }

    return {
      ...requestBody,
      content: this.dereferenceContent(requestBody.content)!
    };
  }

  private dereferenceLink(
    link: LinkObject | ReferenceObject | undefined
  ): DereferencedLinkObject | undefined {
    if (!link) return undefined;

    if (isReferenceObject(link)) {
      return this.resolveRef(link.$ref, (target) =>
        this.dereferenceLink(target as LinkObject | ReferenceObject)
      );
    }

    return { ...link };
  }

  private dereferenceLinks(
    links: Record<string, LinkObject | ReferenceObject> | undefined
  ): Record<string, DereferencedLinkObject> | undefined {
    if (!links) return undefined;

    return Object.fromEntries(
      Object.entries(links)
        .map(([key, value]) => [key, this.dereferenceLink(value)])
        .filter(
          (entry): entry is [string, DereferencedLinkObject] =>
            entry[1] !== undefined
        )
    );
  }

  private dereferenceResponse(
    response: ResponseObject | ReferenceObject | undefined
  ): DereferencedResponseObject | undefined {
    if (!response) return undefined;

    if (isReferenceObject(response)) {
      return this.resolveRef(response.$ref, (target) =>
        this.dereferenceResponse(target as ResponseObject | ReferenceObject)
      );
    }

    return {
      ...response,
      headers: this.dereferenceHeaders(response.headers),
      content: this.dereferenceContent(response.content),
      links: this.dereferenceLinks(response.links)
    };
  }

  private dereferenceResponses(
    responses: ResponsesObject | undefined
  ): DereferencedResponsesObject | undefined {
    if (!responses) return undefined;

    return Object.fromEntries(
      Object.entries(responses)
        .map(([key, value]) => [key, this.dereferenceResponse(value)])
        .filter(
          (entry): entry is [string, DereferencedResponseObject] =>
            entry[1] !== undefined
        )
    );
  }

  private dereferenceCallback(
    callback: CallbackObject | ReferenceObject | undefined
  ): DereferencedCallbackObject | undefined {
    if (!callback) return undefined;

    if (isReferenceObject(callback)) {
      return this.resolveRef(callback.$ref, (target) =>
        this.dereferenceCallback(target as CallbackObject | ReferenceObject)
      );
    }

    return Object.fromEntries(
      Object.entries(callback).map(([key, value]) => [
        key,
        this.dereferencePathItem(value)
      ])
    ) as DereferencedCallbackObject;
  }

  private dereferenceCallbacks(
    callbacks: Record<string, CallbackObject | ReferenceObject> | undefined
  ): Record<string, DereferencedCallbackObject> | undefined {
    if (!callbacks) return undefined;

    return Object.fromEntries(
      Object.entries(callbacks)
        .map(([key, value]) => [key, this.dereferenceCallback(value)])
        .filter(
          (entry): entry is [string, DereferencedCallbackObject] =>
            entry[1] !== undefined
        )
    );
  }

  private dereferenceOperation(
    operation: OperationObject | undefined
  ): DereferencedOperationObject | undefined {
    if (!operation) return undefined;

    return {
      ...operation,
      parameters: this.dereferenceParameters(operation.parameters),
      requestBody: this.dereferenceRequestBody(operation.requestBody),
      responses: this.dereferenceResponses(operation.responses)!,
      callbacks: this.dereferenceCallbacks(operation.callbacks)
    };
  }

  private dereferencePathItem(
    pathItem: PathItemObject | undefined
  ): DereferencedPathItemObject | undefined {
    if (!pathItem) return undefined;

    return {
      ...pathItem,
      get: this.dereferenceOperation(pathItem.get),
      put: this.dereferenceOperation(pathItem.put),
      post: this.dereferenceOperation(pathItem.post),
      delete: this.dereferenceOperation(pathItem.delete),
      options: this.dereferenceOperation(pathItem.options),
      head: this.dereferenceOperation(pathItem.head),
      patch: this.dereferenceOperation(pathItem.patch),
      trace: this.dereferenceOperation(pathItem.trace),
      parameters: this.dereferenceParameters(pathItem.parameters)
    };
  }

  private dereferencePaths(paths: PathsObject): DereferencedPathsObject {
    return Object.fromEntries(
      Object.entries(paths)
        .map(([key, value]) => [key, this.dereferencePathItem(value)])
        .filter(
          (entry): entry is [string, DereferencedPathItemObject] =>
            entry[1] !== undefined
        )
    );
  }

  private dereferenceSecurityScheme(
    securityScheme: SecuritySchemeObject | ReferenceObject | undefined
  ): SecuritySchemeObject | undefined {
    if (!securityScheme) return undefined;

    if (isReferenceObject(securityScheme)) {
      return this.resolveRef(securityScheme.$ref, (target) =>
        this.dereferenceSecurityScheme(
          target as SecuritySchemeObject | ReferenceObject
        )
      );
    }

    return securityScheme;
  }

  private dereferenceComponents(
    components: ComponentsObject
  ): DereferencedComponentsObject {
    const result: DereferencedComponentsObject = {};

    if (components.schemas) {
      result.schemas = Object.fromEntries(
        Object.entries(components.schemas)
          .map(([key, value]) => [key, this.dereferenceSchema(value)])
          .filter(
            (entry): entry is [string, DereferencedSchemaObject] =>
              entry[1] !== undefined
          )
      );
    }

    if (components.responses) {
      result.responses = Object.fromEntries(
        Object.entries(components.responses)
          .map(([key, value]) => [key, this.dereferenceResponse(value)])
          .filter(
            (entry): entry is [string, DereferencedResponseObject] =>
              entry[1] !== undefined
          )
      );
    }

    if (components.parameters) {
      result.parameters = Object.fromEntries(
        Object.entries(components.parameters)
          .map(([key, value]) => [key, this.dereferenceParameter(value)])
          .filter(
            (entry): entry is [string, DereferencedParameterObject] =>
              entry[1] !== undefined
          )
      );
    }

    if (components.examples) {
      result.examples = this.dereferenceExamples(components.examples);
    }

    if (components.requestBodies) {
      result.requestBodies = Object.fromEntries(
        Object.entries(components.requestBodies)
          .map(([key, value]) => [key, this.dereferenceRequestBody(value)])
          .filter(
            (entry): entry is [string, DereferencedRequestBodyObject] =>
              entry[1] !== undefined
          )
      );
    }

    if (components.headers) {
      result.headers = this.dereferenceHeaders(components.headers);
    }

    if (components.securitySchemes) {
      result.securitySchemes = Object.fromEntries(
        Object.entries(components.securitySchemes)
          .map(([key, value]) => [key, this.dereferenceSecurityScheme(value)])
          .filter(
            (entry): entry is [string, SecuritySchemeObject] =>
              entry[1] !== undefined
          )
      );
    }

    if (components.links) {
      result.links = this.dereferenceLinks(components.links);
    }

    if (components.callbacks) {
      result.callbacks = this.dereferenceCallbacks(components.callbacks);
    }

    return result;
  }
}

// ============================================================================
// OpenAPI 3.0 Types (based on @nestjs/swagger internal types)
// These are defined here since @nestjs/swagger only exports OpenAPIObject
// ============================================================================

export interface InfoObject {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  version: string;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
}

export interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariableObject>;
}

export interface ServerVariableObject {
  enum?: string[] | boolean[] | number[];
  default: string | boolean | number;
  description?: string;
}

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject | ReferenceObject>;
  responses?: Record<string, ResponseObject | ReferenceObject>;
  parameters?: Record<string, ParameterObject | ReferenceObject>;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
  headers?: Record<string, HeaderObject | ReferenceObject>;
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
  links?: Record<string, LinkObject | ReferenceObject>;
  callbacks?: Record<string, CallbackObject | ReferenceObject>;
}

export type PathsObject = Record<string, PathItemObject>;

export interface PathItemObject {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: ServerObject[];
  parameters?: (ParameterObject | ReferenceObject)[];
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: (ParameterObject | ReferenceObject)[];
  requestBody?: RequestBodyObject | ReferenceObject;
  responses: ResponsesObject;
  callbacks?: CallbacksObject;
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
}

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}

export type ParameterLocation = "query" | "header" | "path" | "cookie";
export type ParameterStyle =
  | "matrix"
  | "label"
  | "form"
  | "simple"
  | "spaceDelimited"
  | "pipeDelimited"
  | "deepObject";

export interface BaseParameterObject {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject | ReferenceObject;
  examples?: Record<string, ExampleObject | ReferenceObject>;
  example?: unknown;
  content?: ContentObject;
}

export interface ParameterObject extends BaseParameterObject {
  name: string;
  in: ParameterLocation;
}

export interface RequestBodyObject {
  description?: string;
  content: ContentObject;
  required?: boolean;
}

export type ContentObject = Record<string, MediaTypeObject>;

export interface MediaTypeObject {
  schema?: SchemaObject | ReferenceObject;
  examples?: ExamplesObject;
  example?: unknown;
  encoding?: EncodingObject;
}

export type EncodingObject = Record<string, EncodingPropertyObject>;

export interface EncodingPropertyObject {
  contentType?: string;
  headers?: Record<string, HeaderObject | ReferenceObject>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface ResponsesObject extends Record<
  string,
  ResponseObject | ReferenceObject | undefined
> {
  default?: ResponseObject | ReferenceObject;
}

export interface ResponseObject {
  description: string;
  headers?: HeadersObject;
  content?: ContentObject;
  links?: LinksObject;
}

export type CallbacksObject = Record<string, CallbackObject | ReferenceObject>;
export type CallbackObject = Record<string, PathItemObject>;
export type HeadersObject = Record<string, HeaderObject | ReferenceObject>;

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

export type LinksObject = Record<string, LinkObject | ReferenceObject>;

export interface LinkObject {
  operationRef?: string;
  operationId?: string;
  parameters?: LinkParametersObject;
  requestBody?: unknown;
  description?: string;
  server?: ServerObject;
}

export type LinkParametersObject = Record<string, unknown>;
export type HeaderObject = BaseParameterObject;

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

export type ExamplesObject = Record<string, ExampleObject | ReferenceObject>;

export interface ReferenceObject {
  $ref: string;
}

export interface SchemaObject {
  nullable?: boolean;
  discriminator?: DiscriminatorObject;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XmlObject;
  externalDocs?: ExternalDocumentationObject;
  example?: unknown;
  examples?: unknown[] | Record<string, unknown>;
  deprecated?: boolean;
  type?: string;
  allOf?: (SchemaObject | ReferenceObject)[];
  oneOf?: (SchemaObject | ReferenceObject)[];
  anyOf?: (SchemaObject | ReferenceObject)[];
  not?: SchemaObject | ReferenceObject;
  items?: SchemaObject | ReferenceObject;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  additionalProperties?: SchemaObject | ReferenceObject | boolean;
  patternProperties?: SchemaObject | ReferenceObject | Record<string, unknown>;
  description?: string;
  format?: string;
  default?: unknown;
  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: unknown[];
  "x-enumNames"?: string[];
}

export interface DiscriminatorObject {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface XmlObject {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export type SecuritySchemeType = "apiKey" | "http" | "oauth2" | "openIdConnect";

export interface SecuritySchemeObject {
  type: SecuritySchemeType;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlowsObject;
  openIdConnectUrl?: string;
  "x-tokenName"?: string;
  [extension: `x-${string}`]: unknown;
}

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: ScopesObject;
}

export type ScopesObject = Record<string, unknown>;
export type SecurityRequirementObject = Record<string, string[]>;

// ============================================================================
// Dereferenced Types - Same as above but without ReferenceObject options
// ============================================================================

export interface DereferencedSchemaObject extends Omit<
  SchemaObject,
  | "allOf"
  | "oneOf"
  | "anyOf"
  | "not"
  | "items"
  | "properties"
  | "additionalProperties"
  | "patternProperties"
> {
  allOf?: DereferencedSchemaObject[];
  oneOf?: DereferencedSchemaObject[];
  anyOf?: DereferencedSchemaObject[];
  not?: DereferencedSchemaObject;
  items?: DereferencedSchemaObject;
  properties?: Record<string, DereferencedSchemaObject>;
  additionalProperties?: DereferencedSchemaObject | boolean;
  patternProperties?: DereferencedSchemaObject | Record<string, unknown>;
}

export interface DereferencedBaseParameterObject extends Omit<
  BaseParameterObject,
  "schema" | "examples"
> {
  schema?: DereferencedSchemaObject;
  examples?: Record<string, ExampleObject>;
}

export interface DereferencedParameterObject extends DereferencedBaseParameterObject {
  name: string;
  in: "query" | "header" | "path" | "cookie";
}

export type DereferencedHeaderObject = DereferencedBaseParameterObject;

export interface DereferencedEncodingPropertyObject extends Omit<
  EncodingPropertyObject,
  "headers"
> {
  headers?: Record<string, DereferencedHeaderObject>;
}

export interface DereferencedMediaTypeObject extends Omit<
  MediaTypeObject,
  "schema" | "examples"
> {
  schema?: DereferencedSchemaObject;
  examples?: Record<string, ExampleObject>;
}

export type DereferencedContentObject = Record<
  string,
  DereferencedMediaTypeObject
>;

export interface DereferencedRequestBodyObject extends Omit<
  RequestBodyObject,
  "content"
> {
  content: DereferencedContentObject;
}

export interface DereferencedLinkObject extends Omit<LinkObject, "parameters"> {
  parameters?: Record<string, unknown>;
}

export interface DereferencedResponseObject extends Omit<
  ResponseObject,
  "headers" | "content" | "links"
> {
  headers?: Record<string, DereferencedHeaderObject>;
  content?: DereferencedContentObject;
  links?: Record<string, DereferencedLinkObject>;
}

export interface DereferencedResponsesObject extends Record<
  string,
  DereferencedResponseObject | undefined
> {
  default?: DereferencedResponseObject;
}

export type DereferencedCallbackObject = Record<
  string,
  DereferencedPathItemObject
>;

export interface DereferencedOperationObject extends Omit<
  OperationObject,
  "parameters" | "requestBody" | "responses" | "callbacks"
> {
  parameters?: DereferencedParameterObject[];
  requestBody?: DereferencedRequestBodyObject;
  responses: DereferencedResponsesObject;
  callbacks?: Record<string, DereferencedCallbackObject>;
}

export interface DereferencedPathItemObject extends Omit<
  PathItemObject,
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace"
  | "parameters"
> {
  get?: DereferencedOperationObject;
  put?: DereferencedOperationObject;
  post?: DereferencedOperationObject;
  delete?: DereferencedOperationObject;
  options?: DereferencedOperationObject;
  head?: DereferencedOperationObject;
  patch?: DereferencedOperationObject;
  trace?: DereferencedOperationObject;
  parameters?: DereferencedParameterObject[];
}

export type DereferencedPathsObject = Record<
  string,
  DereferencedPathItemObject
>;

export interface DereferencedComponentsObject extends Omit<
  ComponentsObject,
  | "schemas"
  | "responses"
  | "parameters"
  | "examples"
  | "requestBodies"
  | "headers"
  | "securitySchemes"
  | "links"
  | "callbacks"
> {
  schemas?: Record<string, DereferencedSchemaObject>;
  responses?: Record<string, DereferencedResponseObject>;
  parameters?: Record<string, DereferencedParameterObject>;
  examples?: Record<string, ExampleObject>;
  requestBodies?: Record<string, DereferencedRequestBodyObject>;
  headers?: Record<string, DereferencedHeaderObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
  links?: Record<string, DereferencedLinkObject>;
  callbacks?: Record<string, DereferencedCallbackObject>;
}

export interface DereferencedOpenAPIObject extends Omit<
  OpenAPIObject,
  "paths" | "components"
> {
  paths: DereferencedPathsObject;
  components?: DereferencedComponentsObject;
}
