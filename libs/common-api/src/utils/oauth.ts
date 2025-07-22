import { HttpStatus } from "@nestjs/common";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { createHash, randomBytes } from "crypto";

import { AuthorizationRequest, CodeTokenRequest } from "../auth/auth.dto.js";
import { AppError } from "./error.js";

export async function constructAuthorizationRequestUrl({
  clientId,
  redirectUri,
  authorizationEndpoint
}: {
  clientId: string;
  redirectUri: string;
  authorizationEndpoint: string;
}) {
  const state = randomBytes(16).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const authorizationRequest = plainToInstance(AuthorizationRequest, {
    response_type: "code",
    response_mode: "query",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  return {
    state: state,
    code_verifier: codeVerifier,
    url: `${authorizationEndpoint}?${new URLSearchParams({ ...authorizationRequest }).toString()}&dcql_query_id=Administrator`
  };
}

export async function getToken({
  code,
  code_verifier,
  clientId,
  redirectURL,
  tokenEndpoint
}: {
  code: string;
  code_verifier?: string;
  clientId: string;
  redirectURL: string;
  tokenEndpoint: string;
}) {
  const tokenRequest = plainToInstance(CodeTokenRequest, {
    grant_type: "authorization_code",
    code: code,
    client_id: clientId,
    redirect_uri: redirectURL,
    code_verifier: code_verifier
  });
  const response = await axios.post(tokenEndpoint, tokenRequest);
  if (response.data.id_token) {
    return response.data.id_token;
  } else if (response.data.access_token) {
    return response.data.access_token;
  } else {
    throw new AppError("No access token or id token", HttpStatus.UNAUTHORIZED);
  }
}
