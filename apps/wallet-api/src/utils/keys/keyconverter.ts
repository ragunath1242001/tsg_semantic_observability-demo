import { BigNumber } from "bignumber.js";
import { JWK } from "jose";
import {
  base64urlToHex,
  hexToBase58btc,
  hexToBase64url
} from "./typeconverter.js";
import { encode } from "varint";
import elliptic from "elliptic";
import { base58btc } from "multiformats/bases/base58";

/**
 * JWK-to-Multibase algorithm derived from: https://github.com/public-square/jwk-multibase-key-converter-js
 * Varint multicodec prefix value derived from:
 * - https://github.com/multiformats/multicodec/blob/master/table.csv
 * - https://github.com/multiformats/unsigned-varint
 * Checked against examples from: https://w3c-ccg.github.io/did-method-key/#test-vectors
 */
export const multicodecPublic: { [key: string]: string } = {
  Ed25519: "ed",
  "P-384": "1201",
  RSA: "1205",
  "eddsa-jcs-2022": "ed",
  "eddsa-rdfc-2022": "ed",
  "ecdsa-jcs-2019": "1201",
  "ecdsa-rdfc-2019": "1201",
  "RSASSA-PSS": "1205"
};
export const multicodecPrivate: { [key: string]: string } = {
  Ed25519: "1300",
  "P-384": "1307",
  RSA: "1305",
  EdDSA: "1300",
  ES384: "1307",
  X509: "1305"
};

export function varintPrefix(multicodecPrefix: string): string {
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
      ? varintPrefix(multicodecPrivate[jwk.crv]) + base64urlToHex(jwk.d!)
      : varintPrefix(multicodecPublic[jwk.crv])) + base64urlToHex(jwk.x!)
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
      ? varintPrefix(multicodecPrivate[jwk.crv]) + base64urlToHex(jwk.d!)
      : varintPrefix(multicodecPublic[jwk.crv])) +
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
      ? varintPrefix(multicodecPrivate[jwk.kty!])
      : varintPrefix(multicodecPublic[jwk.kty!])) +
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

export function encodedPublicKeyMultiBaseToJWK(
  alg: string,
  encodedPublicKey: string
): JWK {
  const publicKey = Buffer.from(base58btc.decode(encodedPublicKey))
    .toString("hex")
    .replace(varintPrefix(multicodecPublic[alg]), "");
  return publicKeyMultiBaseToJWK(alg, publicKey);
}

export function publicKeyMultiBaseToJWK(alg: string, publicKey: string): JWK {
  let jwk: JWK;
  switch (alg) {
    case "eddsa-jcs-2022":
    case "eddsa-rdfc-2022":
      jwk = {
        kty: "OKP",
        alg: "EdDSA",
        x: hexToBase64url(publicKey.toString()),
        crv: "Ed25519"
      };
      break;
    case "ecdsa-jcs-2019":
    case "ecdsa-rdfc-2019":
      const isOdd = publicKey.slice(0, 2).toString() === "03";
      const xHex = publicKey.slice(2, publicKey.length).toString();
      jwk = {
        kty: "EC",
        alg: "ES384",
        x: hexToBase64url(xHex),
        y: hexToBase64url(
          new elliptic.ec("p384").curve
            .pointFromX(xHex, isOdd)
            .getY()
            .toString("hex")
        ),
        crv: "P-384"
      };
      break;
    case "RSASSA-PSS":
      jwk = {
        kty: "RSA",
        alg: "PS256",
        n: hexToBase64url(publicKey.slice(0, -6).toString()),
        e: hexToBase64url(publicKey.slice(-6).toString())
      };
      break;
    default:
      throw new Error(`Unsupported cryptosuite type ${alg}`);
  }
  return jwk;
}

export function encodedPrivateKeyMultiBaseToJWK(
  type: string,
  encodedPrivateKey: string
): JWK {
  const privateKey = Buffer.from(base58btc.decode(encodedPrivateKey))
    .toString("hex")
    .replace(varintPrefix(multicodecPrivate[type]), "");
  return privateKeyMultiBaseToJWK(type, privateKey);
}

export function privateKeyMultiBaseToJWK(
  type: string,
  privateKey: string
): JWK {
  let jwk: JWK;
  switch (type) {
    case "EdDSA":
      jwk = {
        kty: "OKP",
        alg: "EdDSA",
        x: hexToBase64url(privateKey.slice(64, privateKey.length).toString()),
        crv: "Ed25519",
        d: hexToBase64url(privateKey.slice(0, 64).toString())
      };
      break;
    case "ES384":
      const isOdd = privateKey.slice(96, 98).toString() === "03";
      const xHex = privateKey.slice(98, privateKey.length).toString();
      jwk = {
        kty: "EC",
        alg: "ES384",
        x: hexToBase64url(xHex),
        y: hexToBase64url(
          new elliptic.ec("p384").curve
            .pointFromX(xHex, isOdd)
            .getY()
            .toString("hex")
        ),
        crv: "P-384",
        d: hexToBase64url(privateKey.slice(0, 96).toString())
      };
      break;
    case "X509":
      jwk = {
        kty: "RSA",
        alg: "PS256",
        n: hexToBase64url(privateKey.slice(0, 512).toString()),
        e: hexToBase64url(privateKey.slice(512, 518).toString()),
        d: hexToBase64url(privateKey.slice(518, 1030).toString()),
        p: hexToBase64url(privateKey.slice(1030, 1286).toString()),
        q: hexToBase64url(privateKey.slice(1286, 1542).toString()),
        dp: hexToBase64url(privateKey.slice(1542, 1798).toString()),
        dq: hexToBase64url(privateKey.slice(1798, 2054).toString()),
        qi: hexToBase64url(privateKey.slice(2054, 2310).toString())
      };
      break;
    default:
      throw new Error(`Unsupported key type ${type}`);
  }
  return jwk;
}
