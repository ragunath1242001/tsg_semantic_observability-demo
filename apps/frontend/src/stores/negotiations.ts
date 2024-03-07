import { defineStore } from "pinia";
import { socket } from "../socket";
import { NegotiationDetailDto, NegotiationStatusDto } from "@libs/dtos";
import http from "../utils/http";
import { ref } from "vue";

interface INegotiationStore {
  negotiations: NegotiationStatusDto[];
  ctaNegotiations: NegotiationDetailDto[];
}

const getNegotiations = async () => {
  try {
    const response = await http.get("management/negotiations/");
    const negotiations = response.data;
    const ctaNegotiations = response.data.filter(
      (negotiation: NegotiationStatusDto) =>
        (negotiation.role == "provider" &&
          negotiation.state == "dspace:REQUESTED") ||
        (negotiation.role == "consumer" &&
          negotiation.state == "dspace:AGREED") ||
        (negotiation.role == "provider" &&
          negotiation.state == "dspace:VERIFIED") ||
        (negotiation.role == "consumer" &&
          negotiation.state == "dspace:OFFERED") ||
        (negotiation.role == "provider" &&
          negotiation.state == "dspace:ACCEPTED")
    );
    return {
      negotiations: negotiations,
      ctaNegotiations: ctaNegotiations,
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const useNegotiationStore = defineStore("negotiations", {
  state: (): INegotiationStore => ({
    negotiations: [],
    ctaNegotiations: [],
  }),

  getters: {
    negotiationsCount: (state) => state.ctaNegotiations.length,
  },

  actions: {
    bindEvents() {
      socket.on("connect", async () => {
        console.log("Connected to websocket.");
        const resp = await getNegotiations();
        this.negotiations = resp.negotiations;
        this.ctaNegotiations = resp.ctaNegotiations;
      });

      socket.on("negotiation:update", async (negotiation) => {
        const resp = await getNegotiations();
        this.negotiations = resp.negotiations;
        this.ctaNegotiations = resp.ctaNegotiations;
      });

      socket.on("negotiation:create", async (negotiation) => {
        const resp = await getNegotiations();
        this.negotiations = resp.negotiations;
        this.ctaNegotiations = resp.ctaNegotiations;
      });
    },
  },
});
