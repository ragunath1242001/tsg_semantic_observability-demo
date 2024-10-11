import { BigNumber } from "bignumber.js";
import { JWK } from "jose";
import { base64urlToHex, hexToBase58btc } from "./typeconverter.js";
import { encode } from "varint";

/**
 * JWK-to-Multibase algorithm derived from: https://github.com/public-square/jwk-multibase-key-converter-js
 * Varint multicodec prefix value derived from:
 * - https://github.com/multiformats/multicodec/blob/master/table.csv
 * - https://github.com/multiformats/unsigned-varint
 * Checked against examples from: https://w3c-ccg.github.io/did-method-key/#test-vectors
 */
const multicodecPublic: { [key: string]: string } = {
  Ed25519: "ed",
  "P-384": "1201",
  RSA: "1205",
};
const multicodecPrivate: { [key: string]: string } = {
  Ed25519: "1300",
  "P-384": "1307",
  RSA: "1305",
};
function buildPrefix(multicodecPrefix: string): string {
  return Buffer.from(encode(parseInt(multicodecPrefix, 16))).toString("hex");
}
function isBase64urlEven(s: string): boolean {
  const hex = base64urlToHex(s);
  const big = new BigNumber(hex, 16);
  return big.modulo(2).eq(0);
}
export function jwkOKPToMultibase(
  jwk: JWK,
  isPrivate: boolean = false
): string {
  if (jwk.crv !== "Ed25519") {
    throw new Error(
      `The JWK curve algorithm (crv) ${jwk.crv} is not supported for OKP key type (kty)`
    );
  }
  return hexToBase58btc(
    (isPrivate
      ? buildPrefix(multicodecPrivate[jwk.crv]) + base64urlToHex(jwk.d!)
      : buildPrefix(multicodecPublic[jwk.crv])) + base64urlToHex(jwk.x!)
  );
}
export function jwkECToMultibase(jwk: JWK, isPrivate: boolean = false): string {
  if (jwk.crv !== "P-384") {
    throw new Error(
      `The JWK curve algorithm (crv) ${jwk.crv} is not supported for EC key type (kty)`
    );
  }
  return hexToBase58btc(
    (isPrivate
      ? buildPrefix(multicodecPrivate[jwk.crv]) + base64urlToHex(jwk.d!)
      : buildPrefix(multicodecPublic[jwk.crv])) +
      (isBase64urlEven(jwk.y!) ? "02" : "03") +
      base64urlToHex(jwk.x!)
  );
}
export function jwkRSAToMultibase(
  jwk: JWK,
  isPrivate: boolean = false
): string {
  return hexToBase58btc(
    (isPrivate
      ? buildPrefix(multicodecPrivate[jwk.kty!])
      : buildPrefix(multicodecPublic[jwk.kty!])) +
      base64urlToHex(jwk.n!) +
      base64urlToHex(jwk.e!) +
      (isPrivate
        ? base64urlToHex(jwk.d!) +
          base64urlToHex(jwk.p!) +
          base64urlToHex(jwk.q!) +
          base64urlToHex(jwk.dp!) +
          base64urlToHex(jwk.dq!) +
          base64urlToHex(jwk.qi!)
        : "")
  );
}
export function jwkToMultibase(jwk: JWK, isPrivate: boolean = false): string {
  switch (jwk.kty) {
    case "OKP":
      return jwkOKPToMultibase(jwk, isPrivate);
    case "EC":
      return jwkECToMultibase(jwk, isPrivate);
    case "RSA":
      return jwkRSAToMultibase(jwk, isPrivate);
    default:
      throw new Error(`The JWK key type (kty) ${jwk.kty} is not supported`);
  }
}
