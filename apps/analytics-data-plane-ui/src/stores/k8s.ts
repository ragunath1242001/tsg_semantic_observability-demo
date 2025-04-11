import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

export const useK8sStore = defineStore("k8s", {
  actions: {
    async spawnJob(
      imageName: string,
      transferId: string,
      command: string[],
      fileId?: string
    ) {
      try {
        const response = await http.post("management/k8s/spawn-job", {
          imageName,
          transferId,
          command,
          fileId
        });
        console.log("Response:", response);
        return response;
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    }
  }
});
