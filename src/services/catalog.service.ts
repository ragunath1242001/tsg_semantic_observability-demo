import { Injectable } from "@nestjs/common";
import { CatalogRequestMessage } from "../model/dsp/catalog/messages";
import {
  Catalog,
  DataService,
  Dataset,
  Distribution,
} from "../model/dsp/catalog/catalog";
import { Multilanguage, Reference } from "../model/dsp/common";

@Injectable()
export class CatalogService {
  private catalog: Catalog | undefined;
  private datasets: Dataset[] = [];

  async modifyCatalog(catalog: Catalog): Promise<void> {
    this.catalog = catalog;
  }

  async addDataset(dataset: Dataset): Promise<void> {
    this.datasets.push(dataset);
  }

  async removeDataset(datasetId: string): Promise<void> {
    this.datasets = this.datasets.filter(dataset => dataset.id !== datasetId);
  }

  async request(requestMessage: CatalogRequestMessage): Promise<Catalog> {
    requestMessage.filter?.forEach((filter) => {
      console.log(filter);
    });
    return new Catalog({
      ...this.catalog,
      dataset: this.datasets,
    });
  }

  async getDataset(datasetId: string): Promise<Dataset | undefined> {
    return this.datasets.find((dataset) => dataset.id === datasetId);
  }
}
