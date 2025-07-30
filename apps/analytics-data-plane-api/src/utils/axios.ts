import { AxiosRequestConfig } from "axios";

import { TransferDao } from "../dataplane/transfer.dao.js";

export function getAxiosConfigFromDataAddress(
  transfer: TransferDao
): AxiosRequestConfig {
  return {
    headers: {
      Authorization:
        transfer.dataAddress?.endpointProperties?.find(
          (prop) => prop.name === "Authorization"
        )?.value || ""
    }
  };
}
