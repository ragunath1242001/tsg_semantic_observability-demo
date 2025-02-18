import { DIDDocument } from "did-resolver";
import { AppError } from "../../utils/error.js";
import { HttpStatus, Logger } from "@nestjs/common";
import { DidResolverStrategy } from "../did.resolver.service.js";
import { hexToBase64url } from "../../utils/keys/typeconverter.js";
import { JWK } from "jose";
import { base58btc } from "multiformats/bases/base58";

import elliptic from "elliptic";

export class DidKeyResolverStrategy implements DidResolverStrategy {
  private readonly logger = new Logger(this.constructor.name);

  private generateOkpJwk(
    publicKey: string,
    curve: "Ed25519" | "Bls12381G2"
  ): JWK {
    return {
      kty: "OKP",
      crv: curve,
      x: hexToBase64url(publicKey)
    };
  }

  private generateEcJwk(
    publicKey: string,
    curve: "secp256k1" | "P-256" | "P-384" | "P-521"
  ): JWK {
    const isOdd = publicKey.slice(0, 2).toString() === "03";
    const xHex = publicKey.slice(2, publicKey.length).toString();
    return {
      kty: "EC",
      x: hexToBase64url(xHex),
      y: hexToBase64url(
        new elliptic.ec(curve.replace("-", "").toLowerCase()).curve
          .pointFromX(xHex, isOdd)
          .getY()
          .toString(
            "hex",
            curve === "P-521" ? 132 : curve === "P-384" ? 96 : 64
          )
      ),
      crv: curve
    };
  }

  private generateJwk(multibaseKey: string): JWK {
    const prefixedPublicKey = Buffer.from(
      base58btc.decode(multibaseKey)
    ).toString("hex");
    if (multibaseKey.startsWith("z6Mk")) {
      return this.generateOkpJwk(
        prefixedPublicKey.replace("ed01", ""),
        "Ed25519"
      );
    } else if (multibaseKey.startsWith("zUC7")) {
      return this.generateOkpJwk(
        prefixedPublicKey.replace("eb01", ""),
        "Bls12381G2"
      );
    } else if (multibaseKey.startsWith("zQ3s")) {
      return this.generateEcJwk(
        prefixedPublicKey.replace("e701", ""),
        "secp256k1"
      );
    } else if (multibaseKey.startsWith("zDn")) {
      return this.generateEcJwk(prefixedPublicKey.replace("8024", ""), "P-256");
    } else if (multibaseKey.startsWith("z82")) {
      return this.generateEcJwk(prefixedPublicKey.replace("8124", ""), "P-384");
    } else if (multibaseKey.startsWith("z2J9")) {
      return this.generateEcJwk(prefixedPublicKey.replace("8224", ""), "P-521");
    }

    throw new AppError(
      `No DID resolution support for did:key:${multibaseKey}`,
      HttpStatus.NOT_IMPLEMENTED
    ).andLog(this.logger);
  }

  async resolve(didId: string): Promise<DIDDocument> {
    const multibaseKey = didId.split(":")[2];
    const jwk = this.generateJwk(multibaseKey);

    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/jws-2020/v1"
      ],
      id: didId,
      verificationMethod: [
        {
          id: `${didId}#${multibaseKey}`,
          type: "JsonWebKey2020",
          controller: didId,
          publicKeyJwk: jwk
        }
      ],
      authentication: [`${didId}#${multibaseKey}`],
      assertionMethod: [`${didId}#${multibaseKey}`],
      capabilityDelegation: [`${didId}#${multibaseKey}`],
      capabilityInvocation: [`${didId}#${multibaseKey}`]
    };
  }
}
