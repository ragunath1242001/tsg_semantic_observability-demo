import { describe, expect, it } from "vitest";

import {
  toDockerConfigJson,
  toDockerPullAuthConfig
} from "./image-registry-auth.js";

describe("image-registry-auth", () => {
  it("builds Docker pull auth config from image credentials", () => {
    expect(
      toDockerPullAuthConfig({
        registry: "private-registry.example.com",
        username: "demo-user",
        password: "demo-password"
      })
    ).toEqual({
      username: "demo-user",
      password: "demo-password"
    });
  });

  it("builds Docker config json for Kubernetes image pull secrets", () => {
    expect(
      JSON.parse(
        toDockerConfigJson({
          registry: "private-registry.example.com",
          username: "demo-user",
          password: "demo-password"
        }) ?? "{}"
      )
    ).toEqual({
      auths: {
        "private-registry.example.com": {
          username: "demo-user",
          password: "demo-password",
          auth: Buffer.from("demo-user:demo-password", "utf8").toString(
            "base64"
          )
        }
      }
    });
  });
});
