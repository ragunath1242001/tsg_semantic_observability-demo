import { JWK } from "jose";

import { signingAlgorithm } from "../utils/keymapping.js";
import { verifyJws } from "./jws.js";

describe("JWS verification", () => {
  const publicJwk: JWK = {
    crv: "Ed25519",
    x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
    kty: "OKP"
  };
  it("should verify a valid JWS", async () => {
    const signedJws =
      "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rWQ4USo5ko5oB3KkrQUSAXR9M0w5Zkof8d5ofLEP_npG_l4vMwhRNc14h34ZzLM2UqxKUltzTJIoJBWtbT8dAQ";

    const verifyResult = await verifyJws(
      signedJws,
      publicJwk,
      Buffer.from("test-data")
    );
    expect(verifyResult).toBeDefined();
  });
  it("should validate JWS by explicit algorithm", async () => {
    const signedJws =
      "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rWQ4USo5ko5oB3KkrQUSAXR9M0w5Zkof8d5ofLEP_npG_l4vMwhRNc14h34ZzLM2UqxKUltzTJIoJBWtbT8dAQ";

    const verifyResult = await verifyJws(
      signedJws,
      {
        ...publicJwk,
        alg: signingAlgorithm("EdDSA")
      },
      Buffer.from("test-data")
    );
    expect(verifyResult).toBeDefined();
  });
  it("should throw error for incorrect algorithm", async () => {
    const signedJws =
      "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rWQ4USo5ko5oB3KkrQUSAXR9M0w5Zkof8d5ofLEP_npG_l4vMwhRNc14h34ZzLM2UqxKUltzTJIoJBWtbT8dAQ";
    await expect(
      verifyJws(
        signedJws,
        {
          ...publicJwk,
          alg: "RS256"
        },
        Buffer.from("test-data")
      )
    ).rejects.toThrow("Verification failed");
  });
  it("should throw error for incorrect jws", async () => {
    const signedJws =
      "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rWQ4USo5ko5oB3KkrQUSA14h34ZzLM2UqxKUltzTJIoJBWtbT8dAQ";
    await expect(
      verifyJws(signedJws, publicJwk, Buffer.from("test-data"))
    ).rejects.toThrow("Verification failed");
  });
  it("should validate detached signature", async () => {
    const verifyResult = await verifyJws(
      "",
      publicJwk,
      Buffer.from("test-data"),
      "rWQ4USo5ko5oB3KkrQUSAXR9M0w5Zkof8d5ofLEP_npG_l4vMwhRNc14h34ZzLM2UqxKUltzTJIoJBWtbT8dAQ"
    );
    expect(verifyResult).toBeDefined();
  });
});
