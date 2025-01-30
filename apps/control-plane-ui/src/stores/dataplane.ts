import { DataPlaneDetailsDto } from "@tsg-dsp/common-dsp";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

interface IDataPlaneStore {
  dataPlanes: DataPlaneDetailsDto[];
}

export const useDataPlaneStore = defineStore("dataplane", {
  state: (): IDataPlaneStore => ({
    dataPlanes: []
  }),
  getters: {
    hasDuplicateTypes: (state) => {
      const types = state.dataPlanes.map(
        (dataPlane) => dataPlane.dataplaneType
      );
      return new Set(types).size !== types.length;
    }
  },
  actions: {
    async fetchDataPlanes() {
      try {
        const response = await http.get<DataPlaneDetailsDto[]>(
          "management/dataplanes"
        );
        this.dataPlanes = response.data;
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    },
    async getDataPlanes() {
      if (this.dataPlanes.length === 0) {
        await this.fetchDataPlanes();
      }
      return this.dataPlanes;
    }
  }
});
