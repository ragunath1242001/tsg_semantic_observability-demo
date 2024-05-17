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

  const config = new DocumentBuilder()
    .setTitle("TSG Wallet")
    .setDescription("Description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile("../../docs/openapi.yaml", stringify(document));
  process.exit();
}

bootstrap();
