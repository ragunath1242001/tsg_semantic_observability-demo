import { CatalogDto } from "@tsg-dsp/common-dsp";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

export interface RegistryParticipant {
  didId: string;
  address: string;
}

export const useRegistryStore = defineStore("registry", {
  state: () => ({
    participants: [] as RegistryParticipant[],
    currentParticipantId: null as string | null,
    loading: false,
    error: null as string | null
  }),

  getters: {
    getParticipantByDidId: (state) => (didId: string) => {
      return state.participants.find(
        (participant) => participant.didId === didId
      );
    },

    getParticipantIds: (state) => {
      return state.participants.map((participant) => participant.didId);
    },

    getOtherParticipants: (state) => {
      return state.participants.filter(
        (participant) => participant.didId !== state.currentParticipantId
      );
    }
  },

  actions: {
    async fetchParticipants() {
      this.loading = true;
      this.error = null;

      try {
        const response = await http.get("management/registry/addresses");
        this.participants = response.data;
        return response.data;
      } catch (error) {
        this.error = "Failed to fetch participants from registry";
        console.error("Error fetching participants:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchCurrentParticipantId() {
      try {
        const response = await http.get("management/participant-id");
        this.currentParticipantId = response.data;
        return response.data;
      } catch (error) {
        console.error("Error fetching current participant ID:", error);
        throw error;
      }
    },

    async fetchParticipantCatalog(didId: string) {
      try {
        const response = await http.get<CatalogDto>(
          `management/registry/catalog/${encodeURIComponent(didId)}`
        );
        return response.data;
      } catch (error) {
        console.error(
          `Error fetching catalog for participant ${didId}:`,
          error
        );
        throw error;
      }
    },

    async initialize() {
      this.loading = true;
      this.error = null;

      try {
        await Promise.all([
          this.fetchParticipants(),
          this.fetchCurrentParticipantId()
        ]);
      } catch (error) {
        this.error = "Failed to initialize registry data";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async refreshRegistry() {
      this.loading = true;
      this.error = null;

      try {
        await http.post("management/registry/refresh");
        await this.fetchParticipants();
      } catch (error) {
        this.error = "Failed to refresh registry";
        console.error("Error refreshing registry:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    }
  }
});
