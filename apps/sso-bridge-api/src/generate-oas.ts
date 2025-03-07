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
    exclude: ["health"]
  });
  const config = new DocumentBuilder()
    .setTitle("TSG SSO Bridge")
    .setVersion("")
    .setDescription("TSG SSO Bridge API Documentation ")
    .setLicense(
      "Apache 2.0",
      "https://www.apache.org/licenses/LICENSE-2.0.html"
    )
    .setExternalDoc(
      "Git Repository",
      "https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway"
    )
    .addTag("Health", "Health controller")
    .addTag("Auth", "Authentication controller")
    .addTag("Users", "Users controller")
    .addTag("Oauth", "Oauth controller")
    .addTag("Clients", "Clients controller")

    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile(
    "../../website/docs/apps/sso-bridge/openapi.yaml",
    stringify(document)
  );
  process.exit();
}

bootstrap();
