import type { V1Job, V1PodList } from "@kubernetes/client-node";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

export const useK8sStore = defineStore("k8s", {
  actions: {
    async getJobsForAlgorithmInstance(algorithmInstanceId: string) {
      try {
        const response = await http.get<V1Job[]>(
          `management/k8s/jobs/algorithm-instance/${algorithmInstanceId}`
        );
        return response.data;
      } catch (error) {
        console.error("Error fetching jobs for algorithm instance:", error);
        throw error;
      }
    },

    async getJobPods(jobName: string) {
      try {
        const response = await http.get<V1PodList>(
          `management/k8s/jobs/${jobName}/pods`
        );
        return response.data;
      } catch (error) {
        console.error("Error fetching job pods:", error);
        throw error;
      }
    },

    async getPodLogs(podName: string) {
      try {
        const response = await http.get<string>(
          `management/k8s/pods/${podName}/logs`
        );
        return response.data;
      } catch (error) {
        console.error("Error fetching pod logs:", error);
        throw error;
      }
    }
  }
});
