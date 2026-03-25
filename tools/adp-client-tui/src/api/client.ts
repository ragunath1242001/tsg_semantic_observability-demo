import { createReadStream, statSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { basename } from "node:path";

import axios, { type AxiosInstance } from "axios";
import FormData from "form-data";
import { io, type Socket } from "socket.io-client";

import type {
  AlgorithmEventDto,
  AlgorithmInstanceDto,
  AuthStateDto,
  BridgeClientStatusDto,
  EventsForInstanceDto,
  FileMetadataDto,
  InternalEventDto,
  JobInfo,
  ModeDto,
  PodInfo,
  SettingsDto
} from "../types.js";

function createResponseError(
  message: string,
  response: { status: number; data?: unknown }
): Error & { response: { status: number; data?: unknown } } {
  const error = new Error(message) as Error & {
    response: { status: number; data?: unknown };
  };
  error.response = response;
  return error;
}

export class ApiClient {
  private http: AxiosInstance;
  private accessToken?: string;
  private baseUrl: string;
  private socket?: Socket;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");

    // Start with the URL as-is; probeBaseUrl() will adjust if needed
    this.http = axios.create({
      baseURL: this.baseUrl + "/",
      timeout: 30_000,
      validateStatus: (status) => status < 500
    });

    // Normalize network errors and 5xx responses into thrown errors with
    // human-readable messages so callers don't need to inspect raw axios errors.
    this.http.interceptors.response.use(
      (response) => {
        if (response.status === 401) {
          throw createResponseError(
            "Unauthorized – session expired or invalid token",
            {
              status: response.status,
              data: response.data
            }
          );
        }
        if (response.status >= 500) {
          throw createResponseError(`Server error (${response.status})`, {
            status: response.status,
            data: response.data
          });
        }
        return response;
      },
      (error) => {
        if (
          error?.code === "ECONNREFUSED" ||
          error?.code === "ENOTFOUND" ||
          error?.code === "ECONNRESET"
        ) {
          return Promise.reject(
            new Error("Cannot reach the server – is it running?")
          );
        }
        if (
          error?.code === "ETIMEDOUT" ||
          error?.message?.includes("timeout")
        ) {
          return Promise.reject(
            new Error("Request timed out – server may be offline")
          );
        }
        return Promise.reject(error);
      }
    );

    if (token) {
      this.setToken(token);
    }
  }

  /**
   * Auto-detect the correct API base URL.
   *
   * The ADP backend only uses the `/api` prefix when running with an embedded
   * frontend (`EMBEDDED_FRONTEND`).  In development the Vite proxy rewrites
   * `/api/…` → `/…`, so the NestJS routes live at the root.
   *
   * This method probes the server to figure out which variant works and
   * re-configures the Axios instance accordingly.
   */
  async probeBaseUrl(): Promise<void> {
    // Try the current baseURL first (handles both cases)
    try {
      const res = await this.http.get("auth/user");
      if (res.status !== 404) return; // works!
    } catch {
      // network error — nothing we can do
      return;
    }

    // The request returned 404.  If the user supplied an `/api` suffix the
    // backend probably doesn't use it (dev mode).  Try without.
    if (/\/api\/?$/i.test(this.baseUrl)) {
      const stripped = this.baseUrl.replace(/\/api\/?$/i, "");
      try {
        const probe = await axios.get(`${stripped}/auth/user`, {
          timeout: 5_000,
          validateStatus: (s) => s < 500
        });
        if (probe.status !== 404) {
          this.baseUrl = stripped;
          this.http.defaults.baseURL = stripped + "/";
          return;
        }
      } catch {
        // keep original
      }
    }

    // Conversely, if the user omitted `/api`, try adding it.
    if (!/\/api\/?$/i.test(this.baseUrl)) {
      const withApi = this.baseUrl + "/api";
      try {
        const probe = await axios.get(`${withApi}/auth/user`, {
          timeout: 5_000,
          validateStatus: (s) => s < 500
        });
        if (probe.status !== 404) {
          this.baseUrl = withApi;
          this.http.defaults.baseURL = withApi + "/";
          return;
        }
      } catch {
        // keep original
      }
    }
  }

  setToken(token: string): void {
    this.accessToken = token;
    this.http.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  getToken(): string | undefined {
    return this.accessToken;
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  async getAuthState(): Promise<AuthStateDto> {
    const res = await this.http.get<AuthStateDto>("auth/user");
    return res.data;
  }

  /**
   * Verify the current Bearer token by calling a guarded endpoint (/files).
   *
   * `GET /auth/user` has `@DisableOAuthGuard()`, so it never inspects Bearer
   * tokens — it only works for session-based authentication.  For Bearer tokens
   * (returned by the SSO Bridge PKCE flow) we must hit a *guarded* endpoint
   * instead.  `GET /files` is a good candidate: if the token is valid the
   * guard passes and we get a 200; otherwise we get a 401/302.
   */
  async validateToken(): Promise<boolean> {
    try {
      const res = await this.http.get("files");
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    }
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  async getSettings(): Promise<SettingsDto> {
    const res = await this.http.get<SettingsDto>("settings");
    return res.data;
  }

  async getMode(): Promise<string> {
    const res = await this.http.get<ModeDto>("settings/mode");
    return res.data.mode;
  }

  async getBridgeStatus(): Promise<BridgeClientStatusDto> {
    const res = await this.http.get<BridgeClientStatusDto>("bridge/status");
    return res.data;
  }

  // ─── Files ───────────────────────────────────────────────────────────────────

  async listFiles(): Promise<FileMetadataDto[]> {
    const res = await this.http.get<FileMetadataDto[]>("files");
    return res.data;
  }

  async uploadFile(filePath: string): Promise<void> {
    const form = new FormData();
    const stat = statSync(filePath);
    const fileName = basename(filePath);

    form.append("files[]", createReadStream(filePath), {
      filename: fileName,
      contentType: "application/octet-stream",
      knownLength: stat.size
    });

    await this.http.post("files/upload", form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.http.delete(`files/${fileId}`);
  }

  async previewFile(
    fileId: string,
    previewSize: number = 102400
  ): Promise<string> {
    const res = await this.http.get<string>(`files/${fileId}/preview`, {
      params: { previewSize },
      responseType: "text"
    });
    return res.data;
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const res = await this.http.get(`files/${fileId}/preview`, {
      responseType: "arraybuffer"
    });
    return Buffer.from(res.data);
  }

  // ─── Algorithm Instances ─────────────────────────────────────────────────────

  async listAlgorithmInstances(): Promise<AlgorithmInstanceDto[]> {
    const res = await this.http.get<AlgorithmInstanceDto[]>(
      "management/algorithm-instances"
    );
    return res.data;
  }

  async getAlgorithmInstance(id: string): Promise<AlgorithmInstanceDto> {
    const res = await this.http.get<AlgorithmInstanceDto>(
      `management/algorithm-instances/${id}`
    );
    return res.data;
  }

  async deleteAlgorithmInstance(id: string): Promise<void> {
    await this.http.delete(`management/algorithm-instances/${id}`);
  }

  async getEventsForInstance(
    algorithmInstanceId: string
  ): Promise<EventsForInstanceDto> {
    const res = await this.http.get<EventsForInstanceDto>(
      `events/${algorithmInstanceId}`
    );

    return {
      algorithmEvents: Array.isArray(res.data.algorithmEvents)
        ? res.data.algorithmEvents
        : ([] as AlgorithmEventDto[]),
      internalEvents: Array.isArray(res.data.internalEvents)
        ? res.data.internalEvents
        : ([] as InternalEventDto[])
    };
  }

  async downloadEventData(
    algorithmInstanceId: string,
    eventId: string
  ): Promise<Buffer> {
    const res = await this.http.get(
      `management/algorithm-instances/${algorithmInstanceId}/events/${eventId}/data`,
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data);
  }

  // ─── Orchestration / K8s ─────────────────────────────────────────────────────

  async getJobsForInstance(algorithmInstanceId: string): Promise<JobInfo[]> {
    const res = await this.http.get<JobInfo[]>(
      `management/k8s/jobs/algorithm-instance/${algorithmInstanceId}`
    );
    return Array.isArray(res.data) ? res.data : [];
  }

  async getPodsForJob(jobName: string): Promise<PodInfo[]> {
    const res = await this.http.get<{ items?: PodInfo[] }>(
      `management/k8s/jobs/${jobName}/pods`
    );
    const data = res.data;
    return Array.isArray(data) ? data : (data?.items ?? []);
  }

  async getPodLogs(podName: string): Promise<string> {
    const res = await this.http.get<string>(
      `management/k8s/pods/${podName}/logs`,
      { responseType: "text" }
    );
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }

  async streamPodLogs(
    podName: string,
    tail?: number
  ): Promise<IncomingMessage> {
    const params = tail != null ? { tail } : undefined;
    const res = await this.http.get<IncomingMessage>(
      `management/k8s/pods/${podName}/streamLogs`,
      { responseType: "stream", params, timeout: 0 }
    );
    return res.data;
  }

  // ─── WebSocket ───────────────────────────────────────────────────────────────

  /**
   * Open (or reuse) a Socket.IO connection to the ADP events gateway.
   * The Bearer token is passed in the Socket.IO auth payload so the
   * server's WsAuthMiddleware can validate it without relying on cookies.
   */
  connectSocket(): Socket {
    if (this.socket?.connected) return this.socket;

    // Determine the socket.io path: mirrors what the server configures
    // (with /api prefix when EMBEDDED_FRONTEND, without in dev mode).
    const baseUrl = this.baseUrl.replace(/\/api\/?$/, "");
    const apiPrefix = /\/api\/?$/.test(this.baseUrl) ? "/api" : "";
    const path = `${apiPrefix}/socket.io`;

    this.socket = io(baseUrl, {
      path,
      auth: this.accessToken ? { token: this.accessToken } : undefined,
      reconnection: true,
      reconnectionDelay: 2_000,
      reconnectionAttempts: 10,
      transports: ["websocket"]
    });

    return this.socket;
  }

  disconnectSocket(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  getSocket(): Socket | undefined {
    return this.socket;
  }
}
