import {
  Catalog,
  DataPlaneCreation,
  DataPlaneRequestResponseDto
} from "@tsg-dsp/common-dsp";
import { http, HttpResponse, RequestHandler } from "msw";

type DataPlaneMock = {
  dataPlane: DataPlaneCreation;
  mocks: Array<RequestHandler>;
};

export function setupDataPlaneMock(
  role: "provider" | "consumer",
  id: string,
  type: string
): DataPlaneMock {
  return {
    dataPlane: {
      identifier: id,
      dataplaneType: type,
      endpointPrefix: "",
      callbackAddress: `http://127.0.0.1/data-plane/${id}`,
      managementAddress: `http://127.0.0.1/data-plane/${id}`,
      managementToken: "",
      catalogSynchronization: "push",
      role: role,
      title: "Mock Data Plane"
    },
    mocks: [
      http.post(
        `http://127.0.0.1/data-plane/${id}/transfers/request/${role}`,
        () => {
          const id = crypto.randomUUID();
          return HttpResponse.json<DataPlaneRequestResponseDto>({
            accepted: true,
            identifier: id,
            callbackAddress: `http://127.0.0.1/data-plane/${id}/callbacks/${id}`
          });
        }
      ),

      http.post(
        `http://127.0.0.1/data-plane/${id}/transfers/:id/:action`,
        () => {
          return HttpResponse.json({
            status: "OK"
          });
        }
      ),
      http.get(`http://127.0.0.1/data-plane/${id}/health`, () =>
        HttpResponse.text("")
      ),
      http.get(`http://127.0.0.1/data-plane/${id}/catalog`, async () =>
        HttpResponse.json(new Catalog({ participantId: "" }))
      )
    ]
  };
}
