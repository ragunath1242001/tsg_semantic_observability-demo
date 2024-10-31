import { NestFactory } from "@nestjs/core";
import fs from "fs/promises";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { stringify } from "yaml";

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    { preview: true, abortOnError: false } // <-- This parameters prevent for instantiate controllers but its not necessary for SwaggerModule
  );

  app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
    exclude: [".well-known/(.*)", "health"]
  });
  const config = new DocumentBuilder()
    .setTitle("TSG Control Plane")
    .setDescription(
      `This OpenAPI specification shows the endpoints of the Control Plane. Most of the endpoints are related to the Dataspace Protocol, as specified by the Eclipse Working Group Dataspaces. Other endpoints are supportive endpoints to make sure the data can be added to the catalog, and to make sure that UI interactions can take place.  __*Note*__: This OpenAPI definition is not intended to be directly linked with a single Control Plane instance. `
    )
    .setLicense(
      "Apache 2.0",
      "https://www.apache.org/licenses/LICENSE-2.0.html"
    )
    .setExternalDoc(
      "Git Repository",
      "https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway"
    )
    .addTag("Health", "Health Controller")
    .addTag("Settings", "Settings Controller")
    .addTag("Authentication", "Authentication Controller")
    .addTag("Data Plane", "Data Plane Management Controller")
    .addTag("Data Plane Management", "Data Plane Management Controller")
    .addTag("Catalog", "Catalog Controller")
    .addTag("Catalog Management", "Catalog Management Controller")
    .addTag("Negotiations", "Negotiations Controller")
    .addTag("Negotiations Management", "Negotiations Management Controller")
    .addTag("Transfers", "Transfers Controller")
    .addTag("Transfers Management", "Transfers Management Controller")
    .addTag("Registry", "Registry Controller")
    .addTag("Registry Management", "Registry Management Controller")
    .addOAuth2({
      type: "oauth2",
      flows: {
        password: {
          scopes: {
            controlplane_admin: "controlplane_admin",
            controlplane_dataplane: "controlplane_dataplane"
          }
        }
      }
    })
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "VP",
      description:
        "Verifiable Presentation needed to communicate between two instances of the control plane."
    })

    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile(
    "../../website/docs/apps/control-plane/openapi.yaml",
    stringify(document)
  );
  process.exit();
}

bootstrap();
