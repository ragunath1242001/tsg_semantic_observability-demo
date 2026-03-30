import { AlgorithmImageCredentialsDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { AuthConfig } from "dockerode";

export function toDockerPullAuthConfig(
  imageCredentials: AlgorithmImageCredentialsDto
): AuthConfig | undefined {
  return {
    username: imageCredentials.username,
    password: imageCredentials.password
  };
}

export function toDockerConfigJson(
  imageCredentials: AlgorithmImageCredentialsDto
): string {
  const auth = Buffer.from(
    `${imageCredentials.username}:${imageCredentials.password}`,
    "utf8"
  ).toString("base64");

  return JSON.stringify({
    auths: {
      [imageCredentials.registry]: {
        username: imageCredentials.username,
        password: imageCredentials.password,
        auth
      }
    }
  });
}
