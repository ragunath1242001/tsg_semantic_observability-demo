import { Injectable, Optional } from "@nestjs/common";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import {
  Catalog,
  DataService,
  Dataset,
} from "../../model/dsp/catalog/catalog";
import { InitCatalog, ServerConfig } from "../../config";
import { Multilanguage, Reference } from "../../model/dsp/common";

@Injectable()
export class CatalogService {
  constructor(@Optional() private readonly initCatalog?: InitCatalog, @Optional() private readonly server?: ServerConfig) {
    this.initalizeCatalog()
  }

  private catalog: Catalog | undefined;
  private datasets: Dataset[] = [];

  async initalizeCatalog() {
    if (!this.catalog && this.initCatalog && this.server) {
      const dataServices = new DataService({
        endpointDescription: new Reference('dpsace:connector'),
        conformsTo: new Reference('dpsace:connector'),
        endpointURL: `${this.server.publicAddress}`,
      });
      this.catalog = new Catalog({
        creator: new Reference(this.initCatalog.creator),
        publisher: this.initCatalog.publisher,
        title: this.initCatalog.title,
        description: [new Multilanguage(this.initCatalog.description)],
        service: [dataServices]
      });
    } 
  }

  async modifyCatalog(catalog: Catalog): Promise<void> {
    this.catalog = catalog;
  }

  async addDataset(dataset: Dataset): Promise<void> {
    this.datasets.push(dataset);
  }

  async updateDataset(datasetId: string, dataset: Dataset): Promise<void> {
    await this.removeDataset(datasetId);
    await this.addDataset(dataset);
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
