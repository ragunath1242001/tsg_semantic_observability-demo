import { defineStore } from "pinia";
import { socket } from "../socket";
import {
  NegotiationDetailDto,
  INegotiationStatusDto,
  TransferDetailDto,
  TransferStatus
} from "@tsg-dsp/control-plane-dtos";
import http from "@tsg-dsp/common-ui/utils/http";
import { CatalogDto } from "@tsg-dsp/common-dsp";

interface Catalog {
  catalog: CatalogDto;
  title: string;
  ownDid: string;
  numberOfServices: number;
  numberOfDatasets: number;
}

interface IDspStore {
  ownCatalog: Catalog;
  negotiations: INegotiationStatusDto[];
  ctaNegotiations: NegotiationDetailDto[];
  transfers: TransferStatus[];
  ctaTransfers: TransferDetailDto[];
}

const getNegotiations = async () => {
  try {
    const response = await http.get("management/negotiations/");
    const negotiations = response.data;
    const ctaNegotiations = response.data.filter(
      (negotiation: INegotiationStatusDto) =>
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
      ctaNegotiations: ctaNegotiations
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
      (transfer: TransferStatus) =>
        (transfer.role == "provider" && transfer.state == "dspace:REQUESTED") ||
        transfer.state == "dspace:STARTED" ||
        transfer.state == "dspace:SUSPENDED"
    );
    return {
      transfers: transfers,
      ctaTransfers: ctaTransfers
    };
  } catch (error) {
    // console.error("Error:", error);
    throw error;
  }
};

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
        this.ownCatalog.ownDid = response.data?.["dct:publisher"] || "";
        this.ownCatalog.catalog = response.data;
        this.ownCatalog.numberOfDatasets =
          response.data?.["dcat:dataset"]?.length ?? 0;
        this.ownCatalog.numberOfServices =
          response.data?.["dcat:service"]?.length ?? 0;
        if (response.data?.["dct:title"]) {
          window.document.title = `Control Plane - ${response.data?.["dct:title"]}`;
          this.ownCatalog.title = response.data?.["dct:title"];
        }
      } catch (error) {
        // Handle error
        console.error("Error:", error);
        throw error;
      }
    },
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

      socket.on("connect", async () => {
        await this.getOwnCatalog();
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
    }
  }
});
