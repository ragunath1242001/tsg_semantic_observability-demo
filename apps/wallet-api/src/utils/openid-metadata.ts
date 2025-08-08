import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { CredentialIssuerMetadata } from "@tsg-dsp/wallet-dtos";
import axios from "axios";

export async function retrieveOpenIDIssuerMetadata(
  issuerUrl: string
): Promise<CredentialIssuerMetadata> {
  const credentialIssuerMetadataEndpoint = constructWellKnown(
    "issuer",
    issuerUrl
  );
  try {
    const response = await axios.get<CredentialIssuerMetadata>(
      credentialIssuerMetadataEndpoint
    );

    if (!response.data.token_endpoint) {
      if (response.data.authorization_servers) {
        for (const authorizationServer of response.data.authorization_servers) {
          const tokenEndpoint =
            await retrieveTokenEndpoint(authorizationServer);
          if (tokenEndpoint) {
            return {
              ...response.data,
              token_endpoint: tokenEndpoint
            };
          }
        }
      }
      const tokenEndpoint = await retrieveTokenEndpoint(issuerUrl);
      if (tokenEndpoint) {
        return {
          ...response.data,
          token_endpoint: tokenEndpoint
        };
      } else {
        throw new AppError(
          `Could not find token endpoint for ${issuerUrl}`,
          HttpStatus.BAD_REQUEST
        ).andLog(new Logger("OpenIDIssuerMetadata"));
      }
    }

    return response.data;
  } catch (_) {
    throw new AppError(
      `Could not load OpenID Credential issuer metadata from ${credentialIssuerMetadataEndpoint}`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("OpenIDIssuerMetadata"));
  }
}

async function retrieveTokenEndpoint(
  authorizationServer: string
): Promise<string | undefined> {
  const openIdMetadataEndpoint = constructWellKnown(
    "openid",
    authorizationServer
  );
  const oauthMetadataEndpoint = constructWellKnown(
    "oauth",
    authorizationServer
  );
  try {
    const response = await axios.get(openIdMetadataEndpoint);
    if (response.data.token_endpoint) {
      return response.data.token_endpoint as string;
    } else {
      const response = await axios.get(oauthMetadataEndpoint);
      if (response.data.token_endpoint) {
        return response.data.token_endpoint as string;
      } else {
        return undefined;
      }
    }
  } catch (_) {
    return undefined;
  }
}

function constructWellKnown(
  type: "issuer" | "openid" | "oauth",
  baseUrl: string
) {
  let url: string;
  switch (type) {
    case "issuer":
      url = `${baseUrl}/.well-known/openid-credential-issuer`;
      break;
    case "openid":
      url = `${baseUrl}/.well-known/openid-configuration`;
      break;
    case "oauth":
      url = `${baseUrl}/.well-known/oauth-authorization-server`;
      break;
  }
  return url.replace(/([^:])(\/\/+)/g, "$1/");
}
