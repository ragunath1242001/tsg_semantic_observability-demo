import { NestFactory } from "@nestjs/core";
import fs from "fs/promises";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { stringify } from "yaml";
import { AppRole } from "@libs/dtos";

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    { preview: true, abortOnError: false } // <-- This parameters prevent for instantiate controllers but its not necessary for SwaggerModule
  );

  app.setGlobalPrefix("api", {
    exclude: [
      ".well-known/(.*)",
      "context/(.*)",
      "keys/(.*)",
      "oid4vci/token",
      "oid4vci/credential",
      "health",
    ],
  });
  const appRoles = Object.entries(AppRole).map((r) => [r[1], r[1]]);
  const scopes = Object.fromEntries(appRoles);
  const config = new DocumentBuilder()
    .setTitle("TSG Wallet")
    .setDescription("Description")
    .setVersion("1.0")
    .addTag("Health")
    .addTag("Settings")
    .addTag("Authentication")
    .addTag("DID")
    .addTag("Contexts")
    .addTag("Keys")
    .addTag("Credentials")
    .addTag("Management DID")
    .addTag("Management Contexts")
    .addTag("Management Keys")
    .addTag("Management Credentials")
    .addTag("Management Gaia-X Credentials")
    .addTag("OpenID 4 Verifiable Credential Issuance")
    .addTag("Presentation IATP")
    .addTag("Presentation Direct")
    .addOAuth2({
      type: "oauth2",
      flows: {
        password: {
          scopes: scopes,
        },
      },
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile("../../docs/openapi.yaml", stringify(document));
  process.exit();
}

bootstrap();
