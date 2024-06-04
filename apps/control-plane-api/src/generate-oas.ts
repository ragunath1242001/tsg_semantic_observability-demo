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
    exclude: [".well-known/(.*)", "health"],
  });
  const config = new DocumentBuilder()
    .setTitle("TSG Control Plane")
    .setDescription(
      `I have to come up with a good description    __*Note*__: This OpenAPI definition is not intended to be directly linked with a single Control Plane instance. `
    )
    .setLicense(
      "Apache 2.0",
      "https://www.apache.org/licenses/LICENSE-2.0.html"
    )
    .setExternalDoc(
      "Git Repository",
      "https://gitlab.com/tno-tsg/dataspace-protocol/control-plane"
    )
    .setVersion("1.0")
    .addTag("Health", "Health controller")
    .addTag("Settings", "Settings controller")
    .addTag("Authentication", "Authentication Controller")
    .addTag("Data Plane", "Dataplane controller")
    .addOAuth2({
      type: "oauth2",
      flows: {
        password: {
          scopes: {
            controlplane_admin: "controlplane_admin",
            controlplane_dataplane: "controlplane_dataplane",
          },
        },
      },
    })

    .build();
  const document = SwaggerModule.createDocument(app, config);

  await fs.writeFile("../../docs/openapi.yaml", stringify(document));
  process.exit();
}

bootstrap();
