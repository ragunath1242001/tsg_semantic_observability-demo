// ─── DTOs & Interfaces ───────────────────────────────────────────────────────

export interface SettingsDto {
  mode: "standalone" | "client" | "server";
  auth?: { enabled: boolean };
  [key: string]: unknown;
}

export interface ModeDto {
  mode: "standalone" | "client" | "server";
}

export interface BridgeClientStatusDto {
  mode: "client";
  status: "connected" | "disconnected" | "not-configured";
  oauthClientId?: string;
  serverUrl?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastMessageReceivedAt?: string;
  lastMessageSentAt?: string;
  reconnecting?: boolean;
  reconnectAttempts?: number;
  uptimeMs?: number;
}

export interface UserDto {
  name: string;
  email: string;
  permissions: string[];
  sub: string;
  didId?: string;
}

export interface AuthStateDto {
  state: "authenticated" | "unauthenticated";
  user?: UserDto;
}

export type MetadataStatus = "pending" | "generating" | "complete" | "error";

export interface FileMetadataDto {
  id: string;
  fileSizeInBytes: number;
  fileName: string;
  originalFileName: string;
  mediaType: string;
  presentInLastCheck: boolean;
  csvw?: Record<string, unknown>;
  inlineCsvw?: boolean;
  datasetId?: string;
  metadataStatus: MetadataStatus;
  metadataError?: string;
}

export interface FileUpdateDto {
  originalFileName?: string;
  mediaType?: string;
  csvw?: Record<string, unknown>;
}

export interface AlgorithmParticipant {
  didId: string;
  role: string;
  dataset: string;
}

export interface RoleState {
  name: string;
}

export interface RoleCardinality {
  min: number;
  max?: number;
}

export interface RoleDefinition {
  name: string;
  states: RoleState[];
  cardinality: RoleCardinality;
  communicatesToRoles: string[];
  dataRequirements?: Record<string, unknown>;
}

export interface AlgorithmEvents {
  name: string;
  description: string;
  type: string;
}

export interface InternalEvent {
  name: string;
  description: string;
  type: string;
}

export enum UIElementType {
  FIELD = "field",
  LINE_GRAPH = "line-graph",
  TABLE = "table"
}

export interface UITemplate {
  metric: string;
  description: string;
  type: UIElementType;
}

export interface AlgorithmImageCredentialsDto {
  registry: string;
  username: string;
  password: string;
}

export interface AlgorithmDefinitionDto {
  title: string;
  description: string;
  keywords: string[];
  image: string;
  imageCredentials?: AlgorithmImageCredentialsDto;
  algorithmEvents: AlgorithmEvents[];
  roleDefinitions: RoleDefinition[];
  internalEvents: InternalEvent[];
  uiTemplate: UITemplate[];
}

export interface AlgorithmEventDto {
  id: string;
  eventId: string;
  algorithmInstanceId: string;
  name: string;
  number: number;
  timestamp: string;
  createdBy: string;
  transferIds?: string[];
  recipients?: string[];
}

export interface InternalEventDto {
  id: string;
  algorithmInstanceId: string;
  name: string;
  number: number;
  timestamp: string;
  data?: unknown;
}

export interface EventsForInstanceDto {
  algorithmEvents: AlgorithmEventDto[];
  internalEvents: InternalEventDto[];
}

export type TransferState =
  | "INITIAL"
  | "STARTED"
  | "COMPLETED"
  | "TERMINATED"
  | "SUSPENDED";

export interface TransferDto {
  id: string;
  role: "provider" | "consumer";
  processId: string;
  remoteParty: string;
  secret?: string;
  datasetId?: string;
  state: TransferState;
  createdDate: string;
  modifiedDate: string;
}

export interface ProjectAgreementSummaryDto {
  id: string;
  projectId: string;
  hash?: string;
  title: string;
  status:
    | "WAITING_FOR_SIGNATURES"
    | "SIGNATURE_REQUESTED"
    | "SIGNED"
    | "FINALIZED";
}

export interface AlgorithmInstanceDto {
  id: string;
  algorithmDefinition: AlgorithmDefinitionDto;
  participants: AlgorithmParticipant[];
  createdDate: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  transfers?: TransferDto[];
  algorithmEvents?: AlgorithmEventDto[];
  internalEvents?: InternalEventDto[];
  projectAgreement?: ProjectAgreementSummaryDto;
  orchestrationStatus?: string;
  isInitiator?: boolean;
  participantStatuses?: Record<string, "completed" | "failed" | "terminated">;
}

export interface OIDCDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  issuer: string;
  jwks_uri: string;
  [key: string]: unknown;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

export interface AppConfig {
  baseUrl: string;
  token?: string;
  ssoUrl?: string;
  clientId: string;
  username?: string;
  password?: string;
}

// ─── K8s Orchestration ────────────────────────────────────────────────────────

export interface JobInfo {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  status?: {
    active?: number;
    ready?: number;
    succeeded?: number;
    failed?: number;
    startTime?: string;
    completionTime?: string;
  };
}

export interface PodInfo {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  status?: {
    phase?: "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown";
    startTime?: string;
    containerStatuses?: Array<{
      name?: string;
      ready?: boolean;
      state?: {
        running?: { startedAt?: string };
        terminated?: {
          exitCode?: number;
          finishedAt?: string;
          reason?: string;
        };
        waiting?: { reason?: string };
      };
    }>;
  };
}
