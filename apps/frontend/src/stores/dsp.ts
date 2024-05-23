import { defineStore } from "pinia";
import { socket } from "../socket";
import {
  NegotiationDetailDto,
  NegotiationStatusDto,
  TransferDetailDto,
  TransferStatusDto,
} from "@libs/dtos";
import http from "../utils/http";

interface IDspStore {
  negotiations: NegotiationStatusDto[];
  ctaNegotiations: NegotiationDetailDto[];
  transfers: TransferStatusDto[];
  ctaTransfers: TransferDetailDto[];
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

const getTransfers = async () => {
  try {
    const response = await http.get("management/transfers");
    const transfers = response.data;
    const ctaTransfers = response.data.filter(
      (transfer: TransferStatusDto) =>
        (transfer.role == "provider" && transfer.state == "dspace:REQUESTED") ||
        transfer.state == "dspace:STARTED" ||
        transfer.state == "dspace:SUSPENDED"
    );
    return {
      transfers: transfers,
      ctaTransfers: ctaTransfers,
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

export const useDspStore = defineStore("dsp", {
  state: (): IDspStore => ({
    negotiations: [],
    ctaNegotiations: [],
    transfers: [],
    ctaTransfers: [],
  }),

  getters: {
    negotiationsCount: (state) => state.ctaNegotiations.length,
    ctaTransfersCount: (state) => state.ctaTransfers.length,
  },

  actions: {
    bindEvents() {
      socket.on("connect", async () => {
        const resp = await getNegotiations();
        this.negotiations = resp.negotiations;
        this.ctaNegotiations = resp.ctaNegotiations;
      });

      socket.on("connect", async () => {
        const resp = await getTransfers();
        this.transfers = resp.transfers;
        this.ctaTransfers = resp.ctaTransfers;
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
      socket.on("transfer:update", async (transfer) => {
        const resp = await getTransfers();
        this.transfers = resp.transfers;
        this.ctaTransfers = resp.ctaTransfers;
      });

      socket.on("transfer:create", async (transfer) => {
        const resp = await getTransfers();
        this.transfers = resp.transfers;
        this.ctaTransfers = resp.ctaTransfers;
      });
    },
  },
});
