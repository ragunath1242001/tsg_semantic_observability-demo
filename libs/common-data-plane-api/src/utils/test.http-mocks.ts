import {
  AgreementDto,
  CatalogDto,
  DataPlaneCreation,
  DatasetDto,
  defaultContext
} from "@tsg-dsp/common-dsp";
import { http, HttpHandler, HttpResponse, PathParams } from "msw";

export function createDataPlaneHttpMocks(
  dataPlaneEndpoint: string
): HttpHandler[] {
  return [
    http.post<PathParams, DataPlaneCreation>(
      `${dataPlaneEndpoint}/init`,
      async ({ request }) => {
        const requestBody = await request.json();
        return HttpResponse.json({
          ...requestBody,
          identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9"
        });
      }
    ),
    http.post(`${dataPlaneEndpoint}/:id/catalog`, ({ request }) => {
      return HttpResponse.json(request.json());
    }),
    http.post(`${dataPlaneEndpoint}/:id/dataset`, async () => {
      return HttpResponse.text();
    }),
    http.put(`${dataPlaneEndpoint}/:id/dataset/:datasetId`, async () => {
      return HttpResponse.text();
    }),
    http.delete(`${dataPlaneEndpoint}/:id/dataset/:datasetId`, async () => {
      return HttpResponse.text();
    })
  ];
}

export function createDataPlaneManagementHttpMocks(
  managementEndpoint: string
): HttpHandler[] {
  return [
    http.post(`${managementEndpoint}/transfers/:processId/:action`, () => {
      return HttpResponse.json({ status: "OK" });
    }),
    http.get(`${managementEndpoint}/catalog/request`, () => {
      return HttpResponse.json<CatalogDto>({
        "@context": defaultContext(),
        "@type": "Catalog",
        "@id": "urn:uuid:catalog",
        participantId: "did:web:localhost",
        dataset: []
      });
    }),
    http.get(`${managementEndpoint}/catalog/dataset`, () => {
      return HttpResponse.json<DatasetDto>({
        "@context": defaultContext(),
        "@type": "Dataset",
        "@id": "urn:uuid:test"
      });
    }),
    http.post(`${managementEndpoint}/negotiations/request`, () => {
      return HttpResponse.json({
        "@type": "ContractNegotiation",
        "@id": "urn:uuid:1234",
        providerPid: "providerPid",
        consumerPid: "consumerPid",
        state: "REQUESTED"
      });
    }),
    http.post(`${managementEndpoint}/negotiations/dataset/:dataset`, () => {
      return HttpResponse.json([
        {
          "@type": "ContractNegotiation",
          "@id": "urn:uuid:1234",
          providerPid: "providerPid",
          consumerPid: "consumerPid",
          state: "REQUESTED"
        }
      ]);
    }),
    http.get(`${managementEndpoint}/agreements/:agreementId`, () => {
      return HttpResponse.json<AgreementDto>({
        "@context": defaultContext(),
        "@type": "Agreement",
        "@id": "urn:uuid:test",
        assigner: "did:web:localhost",
        assignee: "did:web:localhost",
        timestamp: new Date().toISOString(),
        target: "urn:uuid:dataset"
      });
    }),
    http.post(`${managementEndpoint}/transfers/:processId/:action`, () => {
      return HttpResponse.json({ status: "OK" });
    }),
    http.get(`${managementEndpoint}/request`, () => {
      return HttpResponse.json({});
    })
  ];
}

export function createDidConnectorHttpMocks(): HttpHandler[] {
  return [
    http.get("http://localhost/.well-known/did.json", () => {
      return HttpResponse.json({
        service: [
          {
            type: "connector",
            serviceEndpoint: "http://remotecontrolplane/"
          }
        ]
      });
    })
  ];
}
