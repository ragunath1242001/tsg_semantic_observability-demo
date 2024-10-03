import { TransferDto } from "@tsg-dsp/common-dtos";
import { defineStore } from "pinia";

export interface TransferStore {
  transfer: TransferDto | null;
}

export const useTransferStore = defineStore("transfer", {
  state: (): TransferStore => ({
    transfer: null,
  }),
});
