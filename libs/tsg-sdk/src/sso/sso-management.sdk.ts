import {
  ClientDto,
  type CreateClientDto,
  type CreateUserDto,
  type UpdateClientDto,
  type UpdateUserDto,
  UserDto
} from "@tsg-dsp/sso-bridge-dtos";

import type { SsoBridgeClient } from "../client.js";
import { validateResponse, validateResponseArray } from "../utils/validate.js";

/**
 * Pagination options for list endpoints in the SSO management API.
 */
export interface PaginationOptions {
  /** Page number (1-based). */
  page?: number;
  /** Number of items per page. */
  perPage?: number;
  /** Sort direction. */
  order?: "ASC" | "DESC";
  /** Field name to order results by. */
  orderBy?: string;
}

/**
 * Manage SSO Bridge users, OAuth clients, and permissions.
 *
 * Accessible via {@link SsoSdk.management}.
 * @example
 * ```ts
 * const users = await sdk.sso.management.getUsers({ page: 1, perPage: 10 });
 * const newClient = await sdk.sso.management.createClient({
 *   name: "my-app",
 *   redirectUris: ["http://localhost:3000/callback"],
 * });
 * ```
 */
export class SsoManagementSdk {
  constructor(private readonly client: SsoBridgeClient) {}

  // ── Users ──────────────────────────────────────────────────────────────

  /**
   * List SSO users with optional pagination.
   * @param options - Pagination and sorting options.
   * @returns An array of validated {@link UserDto} instances.
   */
  async getUsers(options?: PaginationOptions) {
    const { data } = await this.client.GET("/users", {
      params: {
        query: {
          page: options?.page,
          per_page: options?.perPage,
          order: options?.order,
          order_by: options?.orderBy
        }
      }
    });
    return validateResponseArray(UserDto, data ?? []);
  }

  /**
   * Create a new SSO user.
   * @param user - The user details.
   * @returns The created {@link UserDto}.
   */
  async createUser(user: CreateUserDto) {
    const { data } = await this.client.POST("/users/create", {
      body: user
    });
    return validateResponse(UserDto, data!);
  }

  /**
   * Update an existing SSO user.
   * @param id - The user ID.
   * @param user - The fields to update.
   * @returns The updated {@link UserDto}.
   */
  async updateUser(id: string, user: UpdateUserDto) {
    const { data } = await this.client.PATCH("/users/update/{id}", {
      params: { path: { id } },
      body: user
    });
    return validateResponse(UserDto, data!);
  }

  /**
   * Delete an SSO user.
   * @param id - The user ID.
   * @returns The deletion response.
   */
  async deleteUser(id: string) {
    const { data } = await this.client.DELETE("/users/{id}", {
      params: { path: { id } }
    });
    return data!;
  }

  /**
   * Reset two-factor authentication for an SSO user.
   *
   * The user will need to re-enroll in 2FA on their next login.
   * @param id - The user ID.
   * @returns The reset response.
   */
  async resetUser2FA(id: string) {
    const { data } = await this.client.POST("/users/{id}/reset-2fa", {
      params: { path: { id } }
    });
    return data!;
  }

  // ── Clients ────────────────────────────────────────────────────────────

  /**
   * List OAuth clients with optional pagination.
   * @param options - Pagination and sorting options.
   * @returns An array of validated {@link ClientDto} instances.
   */
  async getClients(options?: PaginationOptions) {
    const { data } = await this.client.GET("/clients", {
      params: {
        query: {
          page: options?.page,
          per_page: options?.perPage,
          order: options?.order,
          order_by: options?.orderBy
        }
      }
    });
    return validateResponseArray(ClientDto, data ?? []);
  }

  /**
   * Register a new OAuth client.
   * @param client - The client details including name and redirect URIs.
   * @returns The created {@link ClientDto}.
   */
  async createClient(client: CreateClientDto) {
    const { data } = await this.client.POST("/clients/create", {
      body: client
    });
    return validateResponse(ClientDto, data!);
  }

  /**
   * Update an existing OAuth client.
   * @param id - The client ID.
   * @param client - The fields to update.
   * @returns The updated {@link ClientDto}.
   */
  async updateClient(id: string, client: UpdateClientDto) {
    const { data } = await this.client.PATCH("/clients/update/{id}", {
      params: { path: { id } },
      body: client
    });
    return validateResponse(ClientDto, data!);
  }

  /**
   * Delete an OAuth client.
   * @param id - The client ID.
   * @returns The deletion response.
   */
  async deleteClient(id: string) {
    const { data } = await this.client.DELETE("/clients/{id}", {
      params: { path: { id } }
    });
    return data!;
  }

  // ── Permissions ────────────────────────────────────────────────────────

  /**
   * Get all available permissions in the SSO system.
   * @returns The permissions configuration.
   */
  async getPermissions() {
    const { data } = await this.client.GET("/permissions");
    return data!;
  }
}
