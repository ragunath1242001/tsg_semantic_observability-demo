import {
  CatalogDto,
  TransferDetailDto,
  TransferStatus
} from "@tsg-dsp/common-dsp";
import {
  NegotiationDetailDto,
  NegotiationStatusDto
} from "@tsg-dsp/common-dtos";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

import { socket } from "../socket";

interface Catalog {
  catalog: CatalogDto;
  title: string;
  ownDid: string;
  numberOfServices: number;
  numberOfDatasets: number;
}

interface IDspStore {
  ownCatalog: Catalog;
  negotiations: NegotiationStatusDto[];
  ctaNegotiations: NegotiationDetailDto[];
  transfers: TransferStatus[];
  ctaTransfers: TransferDetailDto[];
}

export const useDspStore = defineStore("dsp", {
  state: (): IDspStore => ({
    ownCatalog: {
      catalog: undefined,
      numberOfDatasets: 0,
      numberOfServices: 0,
      title: "",
      ownDid: ""
    },
    negotiations: [],
    ctaNegotiations: [],
    transfers: [],
    ctaTransfers: []
  }),

  getters: {
    negotiationsCount: (state) => state.ctaNegotiations.length,
    ctaTransfersCount: (state) => state.ctaTransfers.length
  },

  actions: {
    async getOwnCatalog() {
      try {
        const response = await http.get<CatalogDto>(
          "management/catalog/request"
        );
        this.ownCatalog.ownDid = response.data?.publisher || "";
        this.ownCatalog.catalog = response.data;
        this.ownCatalog.numberOfDatasets = response.data?.dataset?.length ?? 0;
        this.ownCatalog.numberOfServices = response.data?.service?.length ?? 0;
        if (response.data?.title) {
          window.document.title = `Control Plane - ${response.data?.title}`;
          this.ownCatalog.title = response.data?.title;
        }
      } catch (error) {
        // Handle error
        console.error("Error:", error);
        throw error;
      }
    },
    async getNegotiations() {
      try {
        const response = await http.get("management/negotiations/");
        const negotiations = response.data;
        const ctaNegotiations = response.data.filter(
          (negotiation: NegotiationStatusDto) =>
            (negotiation.role == "provider" &&
              negotiation.state == "REQUESTED") ||
            (negotiation.role == "consumer" && negotiation.state == "AGREED") ||
            (negotiation.role == "provider" &&
              negotiation.state == "VERIFIED") ||
            (negotiation.role == "consumer" &&
              negotiation.state == "OFFERED") ||
            (negotiation.role == "provider" && negotiation.state == "ACCEPTED")
        );
        this.negotiations = negotiations;
        this.ctaNegotiations = ctaNegotiations;
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    },
    async getTransfers() {
      const response = await http.get("management/transfers");
      const transfers = response.data;
      const ctaTransfers = response.data.filter(
        (transfer: TransferStatus) =>
          (transfer.role == "provider" && transfer.state == "REQUESTED") ||
          transfer.state == "STARTED" ||
          transfer.state == "SUSPENDED"
      );
      this.transfers = transfers;
      this.ctaTransfers = ctaTransfers;
    },
    bindEvents() {
      socket.on("connect", async () => {
        await this.getNegotiations();
      });

      socket.on("connect", async () => {
        await this.getTransfers();
      });

      socket.on("connect", async () => {
        await this.getOwnCatalog();
      });

      socket.on("negotiation:update", async () => {
        await this.getNegotiations();
      });

      socket.on("negotiation:create", async () => {
        await this.getNegotiations();
      });
      socket.on("transfer:update", async () => {
        await this.getTransfers();
      });

      socket.on("transfer:create", async () => {
        await this.getTransfers();
      });
    }
  }
});
