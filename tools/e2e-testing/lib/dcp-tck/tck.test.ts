import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { setupConfigFile, walletHealthy } from "../test.setup.js";

describe("DCP TCK", () => {
  const debug = "CI" in process.env === false;
  let server: HttpServer;
  let app: INestApplication;
  let port: number;
  beforeAll(async () => {
    process.env["EMBEDDED_FRONTEND"] = "true";
    setupConfigFile("wallet.config.yaml");
    const { ensureTckRuntime } = await import("../exec-tck.js");
    await ensureTckRuntime(
      "https://dsptestcontext.blob.core.windows.net/tck/dcp-tck-runtime-2025-06-26.jar",
      "assets/dcp-tck-runtime.jar"
    );
    const { setupApp, AppModule } = await import("@apps/wallet-api");
    const { AppLogger } = await import("@tsg-dsp/common-api");
    const builder = Test.createTestingModule({
      imports: [AppModule]
    });

    if (debug) {
      builder.setLogger(new AppLogger());
    } else {
      builder.setLogger(new AppLogger("error"));
    }
    app = await builder.compile().then((m) => m.createNestApplication());
    const config = setupApp(app);
    port = config.server.port;
    server = await app.listen(config.server.port, config.server.listen);

    await walletHealthy(port);
  });

  afterAll(async () => {
    await app.close();
    await server.close();
  });

  // Test failing until JWT-based credentials are supported
  test.failing("Exec TCK", async () => {
    const { execTck } = await import("../exec-tck.js");
    const result = await execTck(
      "assets/dcp-tck-runtime.jar",
      "assets/dcp.tck.properties"
    );
    expect(result).toContain("All tests passed successfully");
  });
});
