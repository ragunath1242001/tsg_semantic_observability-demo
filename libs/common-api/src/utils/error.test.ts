import axios from "axios";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { parseNetworkError } from "./error.js";

describe("Error", () => {
  let server: SetupServer;
  beforeAll(async () => {
    server = setupServer(
      http.all("http://localhost/badrequest", () =>
        HttpResponse.text("Bad Request", { status: 400 })
      ),
      http.all("http://localhost/connectionerror", () => HttpResponse.error())
    );
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  it("Test network errors", async () => {
    try {
      await axios.get("http://localhost/badrequest");
    } catch (err) {
      const parsed = parseNetworkError(err, "test");
      expect(parsed.getResponse()).toEqual({
        message:
          "Error in test: AxiosError: Request failed with status code 400",
        code: 400,
        body: "Bad Request",
        name: "AppError",
        status: "BAD_REQUEST"
      });
    }
    try {
      await axios.get("http://localhost/connectionerror");
    } catch (err) {
      const parsed = parseNetworkError(err, "test");
      expect(parsed.getResponse()).toEqual({
        message: "Error in test: TypeError: Network error",
        code: 400,
        name: "AppError",
        status: "BAD_REQUEST"
      });
    }
    const nonAxiosError = parseNetworkError(Error("Other error"), "test");
    expect(nonAxiosError.getResponse()).toEqual({
      message: "Unexpected error in test: Error: Other error",
      code: 400,
      name: "AppError",
      status: "BAD_REQUEST"
    });
  });
});
