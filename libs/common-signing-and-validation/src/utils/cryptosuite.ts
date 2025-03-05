import { HttpStatus } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { JWK } from "jose";

export function getCryptoSuite(
  type: "EdDSA" | "ES384" | "X509" | string,
  normalization: "RDFC" | "JCS"
) {
  switch (type) {
    case "EdDSA":
      return normalization === "RDFC" ? "eddsa-rdfc-2022" : "eddsa-jcs-2022";
    case "ES384":
      return normalization === "RDFC" ? "ecdsa-rdfc-2019" : "ecdsa-jcs-2019";
    case "X509":
      return "RSASSA-PSS";
    default:
      throw new AppError(
        `Cannot infer cryptosuite for type ${type}`,
        HttpStatus.BAD_REQUEST
      );
  }
}

export function cryptoSuiteFromJws(jws: string) {
  const jwsHeader = JSON.parse(
    Buffer.from(jws.split(".")[0], "base64url").toString()
  );
  switch (jwsHeader["alg"]) {
    case "EdDSA":
      return "eddsa-rdfc-2022";
    case "ES384":
      return "ecdsa-rdfc-2019";
    case "PS256":
    default:
      return "RSASSA-PSS";
  }
}

export function estimateAlgorithm(key: JWK) {
  switch (key.kty) {
    case "RSA":
      return "PS256";
    case "OKP":
      return key.crv === "Ed25519" ? "EdDSA" : "BLS";
    case "EC":
      switch (key.crv) {
        case "P-256":
          return "ES256";
        case "P-384":
          return "ES384";
        case "P-521":
          return "ES512";
      }
      break;
  }
}
