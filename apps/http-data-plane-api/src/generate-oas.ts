import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import fs from "fs/promises";
import { stringify } from "yaml";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    { preview: true, abortOnError: false } // <-- This parameters prevent for instantiate controllers but its not necessary for SwaggerModule
  );

  app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
    exclude: [".well-known/(.*)", "health"]
  });
  const config = new DocumentBuilder()
    .setTitle("TSG HTTP Data Plane")
    .setVersion("")
    .setDescription(
      `This OpenAPI specification shows the endpoints of the HTTP Data Plane.`
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
    .addTag("Data Plane", "Data Plane Controller")
    .addTag("Data Plane Management", "Data Plane Management Controller")
    .addTag("Proxy", "Proxy Controller")
    .addTag("Logging", "Logging Controller")
    .addOAuth2({
      type: "oauth2",
      flows: {
        password: {
          scopes: {
            httpdataplane_admin: "httpdataplane_admin",
            httpdataplane_dataplane: "httpdataplane_dataplane"
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
    "../../website/docs/apps/http-data-plane/openapi.yaml",
    stringify(document)
  );
  process.exit();
}

bootstrap();
