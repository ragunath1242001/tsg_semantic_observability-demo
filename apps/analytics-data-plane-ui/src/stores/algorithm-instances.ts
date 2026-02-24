import {
  AlgorithmEventDto,
  AlgorithmInstanceDto,
  CreateAlgorithmInstanceDto,
  InternalEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

import { socket } from "../socket";
import { useRuntimeStore } from "./runtime";

export interface AlgorithmInstanceEvents {
  algorithmEvents: AlgorithmEventDto[];
  internalEvents: InternalEventDto[];
}

export const useAlgorithmInstancesStore = defineStore("algorithm-instances", {
  state: () => ({
    algorithmInstances: [] as AlgorithmInstanceDto[],
    events: {} as Record<string, AlgorithmInstanceEvents>,
    loading: false,
    eventsLoading: false,
    error: null as string | null,
    _bound: false
  }),

  getters: {
    getAlgorithmInstanceById: (state) => (id: string) => {
      return state.algorithmInstances.find((instance) => instance.id === id);
    },

    getAlgorithmInstancesByStatus: (state) => (status: string) => {
      return state.algorithmInstances.filter(
        (instance) => instance.status === status
      );
    },

    getEventsForAlgorithmInstance: (state) => (algorithmInstanceId: string) => {
      return (
        state.events[algorithmInstanceId] || {
          algorithmEvents: [],
          internalEvents: []
        }
      );
    }
  },

  actions: {
    async fetchAlgorithmInstances() {
      this.loading = true;
      this.error = null;

      try {
        const response = await http.get<AlgorithmInstanceDto[]>(
          "management/algorithm-instances"
        );
        this.algorithmInstances = response.data;
        return response.data;
      } catch (error) {
        this.error = "Failed to fetch algorithm instances";
        console.error("Error fetching algorithm instances:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchAlgorithmInstanceById(id: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await http.get(`management/algorithm-instances/${id}`);

        // Update the algorithm instance in the store if it exists, otherwise add it
        const existingIndex = this.algorithmInstances.findIndex(
          (a) => a.id === id
        );
        if (existingIndex >= 0) {
          this.algorithmInstances[existingIndex] = response.data;
        } else {
          this.algorithmInstances.push(response.data);
        }

        return response.data;
      } catch (error) {
        this.error = `Failed to fetch algorithm instance ${id}`;
        console.error("Error fetching algorithm instance:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createAlgorithmInstance(
      createAlgorithmInstance: CreateAlgorithmInstanceDto
    ) {
      const runtimeStore = useRuntimeStore();
      if (runtimeStore.isClientMode) {
        throw new Error(
          "Creating algorithm instances is not available in client mode"
        );
      }

      this.loading = true;
      this.error = null;

      try {
        const response = await http.post(
          "management/algorithm-instances",
          createAlgorithmInstance
        );

        // Ensure the newly created instance is at the top
        const existingIndex = this.algorithmInstances.findIndex(
          (i) => i.id === response.data.id
        );
        if (existingIndex >= 0) {
          this.algorithmInstances.splice(existingIndex, 1);
        }
        this.algorithmInstances.unshift(response.data);
        return response.data;
      } catch (error) {
        this.error = "Failed to create algorithm instance";
        console.error("Error creating algorithm instance:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteAlgorithmInstance(id: string) {
      const runtimeStore = useRuntimeStore();
      if (runtimeStore.isClientMode) {
        throw new Error(
          "Deleting algorithm instances is not available in client mode"
        );
      }

      this.loading = true;
      this.error = null;

      try {
        await http.delete(`management/algorithm-instances/${id}`);
        this.algorithmInstances = this.algorithmInstances.filter(
          (instance) => instance.id !== id
        );
      } catch (error) {
        this.error = `Failed to delete algorithm instance ${id}`;
        console.error("Error deleting algorithm instance:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchAlgorithmInstanceForTransfer(transferId: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await http.get(
          `management/algorithm-instances/transfer/${transferId}`
        );

        // Update the algorithm instance in the store if it exists, otherwise add it
        const existingIndex = this.algorithmInstances.findIndex(
          (a) => a.id === response.data.id
        );
        if (existingIndex >= 0) {
          this.algorithmInstances[existingIndex] = response.data;
        } else {
          this.algorithmInstances.push(response.data);
        }

        return response.data;
      } catch (error) {
        this.error = `Failed to fetch algorithm instance for transfer ${transferId}`;
        console.error("Error fetching algorithm instance for transfer:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchEventsForAlgorithmInstance(
      algorithmInstanceId: string,
      silent = false
    ) {
      if (!silent) {
        this.eventsLoading = true;
      }
      this.error = null;

      try {
        const response = await http.get(`events/${algorithmInstanceId}`);
        this.events[algorithmInstanceId] = response.data;
        return response.data;
      } catch (error) {
        this.error = `Failed to fetch events for algorithm instance ${algorithmInstanceId}`;
        console.error("Error fetching events:", error);
        throw error;
      } finally {
        if (!silent) {
          this.eventsLoading = false;
        }
      }
    },

    addEventToAlgorithmInstance(
      algorithmInstanceId: string,
      event: AlgorithmEventDto | InternalEventDto,
      type: "algorithm" | "internal"
    ) {
      if (!this.events[algorithmInstanceId]) {
        this.events[algorithmInstanceId] = {
          algorithmEvents: [],
          internalEvents: []
        };
      }

      if (type === "algorithm") {
        this.events[algorithmInstanceId].algorithmEvents.push(
          event as AlgorithmEventDto
        );
        // Sort by timestamp to maintain order
        this.events[algorithmInstanceId].algorithmEvents.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      } else {
        this.events[algorithmInstanceId].internalEvents.push(
          event as InternalEventDto
        );
        // Sort by timestamp to maintain order
        this.events[algorithmInstanceId].internalEvents.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    },

    clearError() {
      this.error = null;
    },

    /**
     * Refreshes the algorithm instance in the store when a WebSocket event
     * arrives, so the list view stays up-to-date (e.g. status changes).
     */
    async refreshAlgorithmInstance(algorithmInstanceId: string) {
      try {
        await this.fetchAlgorithmInstanceById(algorithmInstanceId);
      } catch {
        // Instance may not be in the list (e.g. belongs to another view); ignore
      }
    },

    _onInternalEvent(data: any) {
      this.addEventToAlgorithmInstance(
        data.algorithmInstance.id,
        data,
        "internal"
      );
      this.refreshAlgorithmInstance(data.algorithmInstance.id);
    },

    _onAlgorithmEvent(data: any) {
      this.addEventToAlgorithmInstance(
        data.algorithmInstance.id,
        data,
        "algorithm"
      );
      this.refreshAlgorithmInstance(data.algorithmInstance.id);
    },

    bindEvents() {
      // Only bind once — listeners persist for the lifetime of the store
      if (this._bound) return;
      this._bound = true;

      const onInternal = this._onInternalEvent.bind(this);
      const onAlgorithm = this._onAlgorithmEvent.bind(this);

      socket.on("event:internal:create", onInternal);
      socket.on("event:algorithm:create", onAlgorithm);
    }
  }
});
