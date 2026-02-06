import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Resource } from "@tsg-dsp/common-dtos";
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
  const actions = ["create", "read", "update", "delete", "execute", "manage"];
  const scopes: Record<string, string> = Object.fromEntries(
    [
      Resource.ADP_ALGORITHM,
      Resource.ADP_CONFIG,
      Resource.ADP_DATAPLANE,
      Resource.ADP_FILE,
      Resource.ADP_ORCHESTRATION,
      Resource.ADP_PROJECT_AGREEMENT
    ].flatMap((r) => actions.map((a) => [`${a}:${r}`, `${a}:${r}`]))
  );
  const config = new DocumentBuilder()
    .setTitle("TSG Analytics Data Plane")
    .setVersion("")
    .setDescription(
      `This OpenAPI specification shows the endpoints of the Analytics Data Plane.`
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
    .addTag("Logging", "Logging Controller")
    .addOAuth2({
      type: "oauth2",
      flows: {
        authorizationCode: {
          scopes: scopes
        },
        clientCredentials: {
          scopes: scopes
        }
      }
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile(
    "../../website/docs/apps/analytics-data-plane/openapi.yaml",
    stringify(document)
  );
  process.exit();
}

bootstrap();
