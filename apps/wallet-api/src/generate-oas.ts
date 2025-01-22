import { NestFactory } from "@nestjs/core";
import fs from "fs/promises";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { stringify } from "yaml";
import { AppRole } from "@tsg-dsp/wallet-dtos";

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    { preview: true, abortOnError: false } // <-- This parameters prevent for instantiate controllers but its not necessary for SwaggerModule
  );

  app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
    exclude: [
      ".well-known/(.*)",
      "context/(.*)",
      "keys/(.*)",
      "oid4vci/token",
      "oid4vci/credential",
      "health"
    ]
  });
  const appRoles = Object.entries(AppRole).map((r) => [r[1], r[1]]);
  const scopes = Object.fromEntries(appRoles);
  const config = new DocumentBuilder()
    .setTitle("TSG Wallet")
    .setVersion("")
    .setDescription(
      `The TSG Wallet is a SSI wallet that can issue and store verifiable credentials and create presentations to be used within data spaces.<br /><br />
    The wallet is aimed at multi-tier deployments, with one (or more) wallet that acts as trust anchor for a data space and indivual wallets for each of the participants in the data space. On this page the central wallet that issues credentials will be called the Dataspace Wallet although it is not required that there always is exactly one issuer of credentials in a dataspace.<br /><br />
    __*Note*__: This OpenAPI definition is not intended to be directly linked with a single Wallet instance. `
    )
    .setLicense(
      "Apache 2.0",
      "https://www.apache.org/licenses/LICENSE-2.0.html"
    )
    .setExternalDoc(
      "Git Repository",
      "https://gitlab.com/tno-tsg/dataspace-protocol/wallet"
    )
    .addTag("Health", "Health controller")
    .addTag("Settings", "Settings controller")
    .addTag("Authentication", "Authentication Controller")
    .addTag("DID", "DID Controller")
    .addTag("Contexts", "Contexts Controller")
    .addTag("Keys", "Keys Controller")
    .addTag("Credentials", "Credentials Controller")
    .addTag("Management DID", "Management DID Controller")
    .addTag("Management Contexts", "Management Contexts Controller")
    .addTag("Management Keys", "Management Keys Controller")
    .addTag("Management Credentials", "Management Credentials Controller")
    .addTag(
      "Management Gaia-X Credentials",
      "Management Gaia-X Credentials Controller"
    )
    .addTag("Management Presentation", "Management Presentation Controller")
    .addTag(
      "OpenID 4 Verifiable Credential Issuance",
      "OpenID 4 Verifiable Credential Issuance Controller"
    )
    .addTag("Presentation DCP", "Presentation DCP Controller")
    .addTag("Presentation Direct", "Presentation Direct Controller")
    .addOAuth2({
      type: "oauth2",
      flows: {
        password: {
          scopes: scopes
        }
      }
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile(
    "../../website/docs/apps/wallet/openapi.yaml",
    stringify(document)
  );
  process.exit();
}

bootstrap();
