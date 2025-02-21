import { defineStore } from "pinia";
import http from "@tsg-dsp/common-ui/utils/http";

export const useK8sStore = defineStore("k8s", {
  actions: {
    async spawnJob() {
      try {
        const response = await http.get<boolean>("management/k8s/spawn-job");
        console.log("Response:", response);
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    }
  }
});
