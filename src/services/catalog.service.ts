import { Injectable } from "@nestjs/common";
import { CatalogRequestMessage } from "../model/dsp/catalog/messages";
import { Catalog, Dataset } from "../model/dsp/catalog/catalog";

@Injectable()
export class CatalogService {
  async request(requestMessage: CatalogRequestMessage): Promise<Catalog> {
    requestMessage.filter?.forEach(filter => {
      console.log(filter)
    })
    return new Catalog({
      id: 'urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085'
    });
  }

  async getDataset(datasetId: string): Promise<Dataset | undefined> {
    if (datasetId == 'urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea') {
      return new Dataset({
        id: 'urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea'
      })
    } else {
      return undefined;
    }
  }
}