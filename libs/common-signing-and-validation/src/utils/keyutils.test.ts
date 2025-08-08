import { JWK } from "jose";

import {
  cryptoSuiteFromJws,
  estimateAlgorithm,
  getCryptoSuite
} from "./cryptosuite.js";
import {
  encodedPrivateKeyMultiBaseToJWK,
  encodedPublicKeyMultiBaseToJWK,
  jwkToMultibase,
  privateKeyMultiBaseToJWK,
  publicKeyMultiBaseToJWK
} from "./keyconverter.js";
import { keyTypes, signingAlgorithm } from "./keymapping.js";

describe("Key Utils test", () => {
  it("Cryptosuites", () => {
    expect(getCryptoSuite("EdDSA", "RDFC")).toEqual("eddsa-rdfc-2022");
    expect(getCryptoSuite("EdDSA", "JCS")).toEqual("eddsa-jcs-2022");
    expect(getCryptoSuite("ES384", "RDFC")).toEqual("ecdsa-rdfc-2019");
    expect(getCryptoSuite("ES384", "JCS")).toEqual("ecdsa-jcs-2019");
    expect(getCryptoSuite("X509", "RDFC")).toEqual("RSASSA-PSS");
    expect(getCryptoSuite("X509", "JCS")).toEqual("RSASSA-PSS");

    expect(cryptoSuiteFromJws(`eyJhbGciOiJFZERTQSJ9..`)).toEqual(
      "eddsa-rdfc-2022"
    );
    expect(cryptoSuiteFromJws(`eyJhbGciOiJFUzM4NCJ9..`)).toEqual(
      "ecdsa-rdfc-2019"
    );
    expect(cryptoSuiteFromJws(`eyJhbGciOiJQUzI1NiJ9..`)).toEqual("RSASSA-PSS");
  });
  describe("Key conversion", () => {
    it("EDDSA", () => {
      const jwk: JWK = {
        crv: "Ed25519",
        d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo",
        x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
        kty: "OKP"
      };
      const publicMultibase = jwkToMultibase(jwk, false);
      expect(publicMultibase).toEqual(
        "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz"
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "zrv49NjAzAVXqpPgCi2Qc7pwPk6CBVzKDwMxdU9DrGwdosRxTiKJ1QfWQgNW5aXnLgxtCNpEAZHzJ3pJdhKtXQVJsrk"
      );

      const parsedJwk = encodedPublicKeyMultiBaseToJWK(
        "eddsa-jcs-2022",
        publicMultibase
      );
      expect(parsedJwk.x).toEqual(jwk.x);

      expect(() => jwkToMultibase({ ...jwk, crv: "Unknown" }, false)).toThrow(
        "The JWK curve algorithm (crv) Unknown is not supported for OKP key type (kty)"
      );
    });
    it("ES384", () => {
      const jwk: JWK = {
        kty: "EC",
        alg: "ES384",
        x: "HvAXo6qRLSn9yosyiMJR126nlWSCJNIhFAAVPQ4qrsqokOttWC1AvE04pmbRE777",
        y: "cgdrE53Vgcdkn0Q1iljf9fNnJX5LDmFoxwTTPY6iG3S01t0e-4hDlim-G-OT0zEr",
        crv: "P-384",
        d: "QkdL2rGZbUz0o2Nm-UsQIdN_bq4VTtY6S0dAjb61304tpbnj6f-vxQ_orkmxJf7o"
      };
      const publicMultibase = jwkToMultibase(jwk, false);
      expect(publicMultibase).toEqual(
        "z82Lkw3cH1MH4UcpQWywAV9ceiBue8SGahy9JFYGLY3xzWX5dm5nf9Hs4k7KfMoUFaPQGUi"
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "z2C2CqgLYPzBgnFFpipzdcucggesArVkhfCESDo1EgWiqh7UHwCEf3gZtucgX3ApFKCCEA6xXNwqXXUXeefdtM2SVqiTBe2g6KeGoKzbJnckHPDHeNudRXqmerCBcFyUTf6u14ySz"
      );
      const parsedJwk = encodedPublicKeyMultiBaseToJWK(
        "ecdsa-jcs-2019",
        publicMultibase
      );
      expect(parsedJwk.x).toEqual(jwk.x);
      expect(parsedJwk.y).toEqual(jwk.y);
      expect(() => jwkToMultibase({ ...jwk, crv: "Unknown" }, false)).toThrow(
        "The JWK curve algorithm (crv) Unknown is not supported for EC key type (kty)"
      );
    });
    it("X509", () => {
      const jwk: JWK = {
        kty: "RSA",
        n: "0sQI9njoBgzaJ9zXILy-4KlGsFT_jYmgHYLm-bJzARniU0paH6FtKnChnXMlQeYDiikpY_kelsYysRywQ0Ck_1L5QDTaq5tXMvKQFCySn37zo4uQz-pzTbowuSHjEgNAOt_PnckyhNMXX9M_YYsUIcGsPA_e3Ld-y9WDPlnLUs0",
        e: "AQAB",
        d: "noqb-1tDnZl5WNcEdDnGk5SB-g5WFY_bA5f-SwHzBHcGCoU5eeWiCnSi_Z8p_YIaU4lW-z7fxabdZuEfrdcoxRAQOxXY7qYTHYAf0uputnuD4U7sJOI7OmPiLsJznVXPrfQfU398fAT6vAARjqgQ8SZ7AyAgwm7qbcCyq_a7SUE",
        p: "_zeKvXaa-ZZasCN39il-yXAtwYH88KFF5WGqVzbRgTjioiybvjNyp8cvpfjnuY2RMoat5Vd8uUvKZ4qvPOoYaQ",
        q: "02mUSIUEPyl2mwd3vHkDaNKgfdmBHOc0PDpRtEdyxzwIfTZKjXE8BDTrmwOeW5N1IhrsHD0PwPsTEbjOtVD6xQ",
        dp: "L3eIEVbm2fbR5SKjpB_xmcuIZw4jGioUkuYIRXJHou4OkLUVPlnZQEU2onrZtlQTJj-QRjBwXRIwkfNkRkMPyQ",
        dq: "NjkpICSFv1F6Ky8SJdP_7N3A7iZgODKQsjXfCNceeD1MjBjlrDtzwjx0hXC7KA-9Bj9TebarmLqM3InC8rxPZQ",
        qi: "-A0ZaCVSOFVQofrWY3qn6Ee7DEeakOYYR99lN_6ZKw_P8IQkXuhHWdsImgcJa5p8HOlL7rW3axiaafDRK6l7Zw"
      };
      const publicMultibase = jwkToMultibase(jwk, false);
      expect(publicMultibase).toEqual(
        "z7nWgPwHFV3kXMZeUEJZ1jcPWDWEY2vtP4BiTmBGWKmucTUi7MLWQU6GYTTmvcKiTvUnZuRg9HE4iHEvrC1Qujx8R4WyDJCmoj4qA8YmtmdpUmwANdsBdrwk3BqZXphRAZnGhRdMM8dzmqusUDGdzuzkx9UVYf7pBGCc3bjF3pBRMCqRjBgqJDv"
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "z4CbFA4s7cy8vQexwVNeC695nMRm61PF1uHntCLMG1SK1vahn57GiqXBjyVDwSrpdWF4ZJkqSD8dbYR3FZxWKyCQkFqSQsAWTeqhpiEoFpP5EpeVFBKarcE4YSpXsoSNQse55JKtxhXNuY4tn7hp2rbKBhZYy5GhMWLidTSFFBY4FENs8ExGtRBgQmr5YJtF8fgkPcxn4TaDgSzVh3Q8fCRkaicPocVs2CtqoxVitZK99b5p1xhTTy4icXGeopS4gho8rAsHYYLdMPri4RzUQv3VWSmsWnBCHVtSAePp77ng4SCmtFooZnh9gXvWpraC8eGUbwY9pGj8bdWFcf3t8BXkLouC7yVVzGwyU1HZVYpPrKZcGjTXXmk5kpCGksKrsJUqUBYpqKpTCtQx5sSC5CGDhk8gTR5t63JEg2DTUvJzWzkN1Sz9HG6VkmsLrM3ofdvNsenmi7xEyH4FSpmA8fp7MJcQfVhzrx7G7xrHaqfZhAoz5VfHTV4wsaCJ8cRWppYkjX8vMmcyxWY3gUHAYJWrUnQc7BXQfV22ry3qTAZku9x4z16nqiJctVv8HozMeRjDjqv4snwSVTE1wRjWktWKTxkg9PWfRua7jVmunXtZwWoZd5CTL3GLy3XoAxRa9gyoX6e7unhbKT8aapzpoRg71NW646xgTecH8tmGDLw5Vwr7m92E8UeHcQeMzDm32gs4FNL367KQzC1BUoSDKwqZ8rQxhow4bqTGRdUjCBPT1aat1SEXybGao22B6oJ3aHUkv92TqxKumZxfEjxXpnBTsDQ"
      );

      const parsedJwk = encodedPublicKeyMultiBaseToJWK(
        "RSASSA-PSS",
        publicMultibase
      );
      expect(parsedJwk.n).toEqual(jwk.n);
      expect(parsedJwk.e).toEqual(jwk.e);
    });
    it("Unsupported type", () => {
      expect(() => jwkToMultibase({ kty: "unknown" }, false)).toThrow(
        "The JWK key type (kty) unknown is not supported"
      );
      expect(() => publicKeyMultiBaseToJWK("unknown", "")).toThrow(
        "Unsupported cryptosuite type unknown"
      );
    });
  });
  describe("Cryptosuite tests", () => {
    it("getCryptoSuite", () => {
      expect(getCryptoSuite("EdDSA", "RDFC")).toEqual("eddsa-rdfc-2022");
      expect(getCryptoSuite("EdDSA", "JCS")).toEqual("eddsa-jcs-2022");
      expect(getCryptoSuite("ES384", "RDFC")).toEqual("ecdsa-rdfc-2019");
      expect(getCryptoSuite("ES384", "JCS")).toEqual("ecdsa-jcs-2019");
      expect(getCryptoSuite("X509", "RDFC")).toEqual("RSASSA-PSS");
      expect(getCryptoSuite("X509", "JCS")).toEqual("RSASSA-PSS");
      expect(() => getCryptoSuite("Unknown", "RDFC")).toThrow(
        "Cannot infer cryptosuite for type Unknown"
      );
    });
    it("cryptoSuiteFromJws", () => {
      expect(cryptoSuiteFromJws(`eyJhbGciOiJFZERTQSJ9..`)).toEqual(
        "eddsa-rdfc-2022"
      );
      expect(cryptoSuiteFromJws(`eyJhbGciOiJFUzM4NCJ9..`)).toEqual(
        "ecdsa-rdfc-2019"
      );
      expect(cryptoSuiteFromJws(`eyJhbGciOiJQUzI1NiJ9..`)).toEqual(
        "RSASSA-PSS"
      );
    });
    it("estimateAlgorithm", () => {
      const eddsaJwk: JWK = {
        kty: "OKP",
        crv: "Ed25519",
        x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU"
      };
      expect(estimateAlgorithm(eddsaJwk)).toEqual("EdDSA");

      const blsJwk: JWK = {
        kty: "OKP",
        crv: "BLS12-381",
        x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU"
      };
      expect(estimateAlgorithm(blsJwk)).toEqual("BLS");

      const ecdsa256Jwk: JWK = {
        kty: "EC",
        crv: "P-256",
        x: "x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8",
        y: "y1z2a3b4c5d6e78f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8"
      };
      expect(estimateAlgorithm(ecdsa256Jwk)).toEqual("ES256");

      const ecdsa384Jwk: JWK = {
        kty: "EC",
        crv: "P-384",
        x: "HvAXo6qRLSn9yosyiMJR126nlWSCJNIhFAAVPQ4qrsqokOttWC1AvE04pmbRE777",
        y: "cgdrE53Vgcdkn0Q1iljf9fNnJX5LDmFoxwTTPY6iG3S01t0e-4hDlim-G-OT0zEr"
      };
      expect(estimateAlgorithm(ecdsa384Jwk)).toEqual("ES384");

      const ecdsa521Jwk: JWK = {
        kty: "EC",
        crv: "P-521",
        x: "x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8",
        y: "y1z2a3b4c5d6e78f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8"
      };
      expect(estimateAlgorithm(ecdsa521Jwk)).toEqual("ES512");

      const rsaJwk: JWK = {
        kty: "RSA",
        n: "0sQI9njoBgzaJ9zXILy-4KlGsFT_jYmgHYLm-bJzARniU0paH6FtKnChnXMlQeYDiikpY_kelsYysRywQ0Ck_1L5QDTaq5tXMvKQFCySn37zo4uQz-pzTbowuSHjEgNAOt_PnckyhNMXX9M_YYsUIcGsPA_e3Ld-y9WDPlnLUs0",
        e: "AQAB"
      };
      expect(estimateAlgorithm(rsaJwk)).toEqual("PS256");
      expect(estimateAlgorithm({ kty: "Unknown" } as JWK)).toBeUndefined();
    });
  });
  describe("Key converter tests", () => {
    it("jwkOKPToMultibase", () => {
      const jwk: JWK = {
        kty: "OKP",
        crv: "Ed25519",
        x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
        d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo"
      };
      const multibase = jwkToMultibase(jwk);
      expect(multibase).toEqual(
        "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz"
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "zrv49NjAzAVXqpPgCi2Qc7pwPk6CBVzKDwMxdU9DrGwdosRxTiKJ1QfWQgNW5aXnLgxtCNpEAZHzJ3pJdhKtXQVJsrk"
      );
      expect(() => jwkToMultibase({ ...jwk, crv: "Unknown" }, false)).toThrow(
        "The JWK curve algorithm (crv) Unknown is not supported for OKP key type (kty)"
      );
    });
    it("jwkECToMultibase", () => {
      const jwk: JWK = {
        kty: "EC",
        crv: "P-384",
        x: "HvAXo6qRLSn9yosyiMJR126nlWSCJNIhFAAVPQ4qrsqokOttWC1AvE04pmbRE777",
        y: "cgdrE53Vgcdkn0Q1iljf9fNnJX5LDmFoxwTTPY6iG3S01t0e-4hDlim-G-OT0zEr",
        d: "QkdL2rGZbUz0o2Nm-UsQIdN_bq4VTtY6S0dAjb61304tpbnj6f-vxQ_orkmxJf7o"
      };
      const multibase = jwkToMultibase(jwk);
      expect(multibase).toEqual(
        "z82Lkw3cH1MH4UcpQWywAV9ceiBue8SGahy9JFYGLY3xzWX5dm5nf9Hs4k7KfMoUFaPQGUi"
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "z2C2CqgLYPzBgnFFpipzdcucggesArVkhfCESDo1EgWiqh7UHwCEf3gZtucgX3ApFKCCEA6xXNwqXXUXeefdtM2SVqiTBe2g6KeGoKzbJnckHPDHeNudRXqmerCBcFyUTf6u14ySz"
      );
      expect(() => jwkToMultibase({ ...jwk, crv: "Unknown" }, false)).toThrow(
        "The JWK curve algorithm (crv) Unknown is not supported for EC key type (kty)"
      );
    });
    it("jwkRSAToMultibase", () => {
      const jwk: JWK = {
        kty: "RSA",
        n: "0sQI9njoBgzaJ9zXILy-4KlGsFT_jYmgHYLm-bJzARniU0paH6FtKnChnXMlQeYDiikpY_kelsYysRywQ0Ck_1L5QDTaq5tXMvKQFCySn37zo4uQz-pzTbowuSHjEgNAOt_PnckyhNMXX9M_YYsUIcGsPA_e3Ld-y9WDPlnLUs0",
        e: "AQAB",
        d: "noqb-1tDnZl5WNcEdDnGk5SB-g5WFY_bA5f-SwHzBHcGCoU5eeWiCnSi_Z8p_YIaU4lW-z7fxabdZuEfrdcoxRAQOxXY7qYTHYAf0uputnuD4U7sJOI7OmPiLsJznVXPrfQfU398fAT6vAARjqgQ8SZ7AyAgwm7qbcCyq_a7SUE",
        p: "_zeKvXaa-ZZasCN39il-yXAtwYH88KFF5WGqVzbRgTjioiybvjNyp8cvpfjnuY2RMoat5Vd8uUvKZ4qvPOoYaQ",
        q: "02mUSIUEPyl2mwd3vHkDaNKgfdmBHOc0PDpRtEdyxzwIfTZKjXE8BDTrmwOeW5N1IhrsHD0PwPsTEbjOtVD6xQ",
        dp: "L3eIEVbm2fbR5SKjpB_xmcuIZw4jGioUkuYIRXJHou4OkLUVPlnZQEU2onrZtlQTJj-QRjBwXRIwkfNkRkMPyQ",
        dq: "NjkpICSFv1F6Ky8SJdP_7N3A7iZgODKQsjXfCNceeD1MjBjlrDtzwjx0hXC7KA-9Bj9TebarmLqM3InC8rxPZQ",
        qi: "-A0ZaCVSOFVQofrWY3qn6Ee7DEeakOYYR99lN_6ZKw_P8IQkXuhHWdsImgcJa5p8HOlL7rW3axiaafDRK6l7Zw"
      };
      const multibase = jwkToMultibase(jwk);
      expect(multibase).toEqual(
        "z7nWgPwHFV3kXMZeUEJZ1jcPWDWEY2vtP4BiTmBGWKmucTUi7MLWQU6GYTTmvcKiTvUnZuRg9HE4iHEvrC1Qujx8R4WyDJCmoj4qA8YmtmdpUmwANdsBdrwk3BqZXphRAZnGhRdMM8dzmqusUDGdzuzkx9UVYf7pBGCc3bjF3pBRMCqRjBgqJDv"
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "z4CbFA4s7cy8vQexwVNeC695nMRm61PF1uHntCLMG1SK1vahn57GiqXBjyVDwSrpdWF4ZJkqSD8dbYR3FZxWKyCQkFqSQsAWTeqhpiEoFpP5EpeVFBKarcE4YSpXsoSNQse55JKtxhXNuY4tn7hp2rbKBhZYy5GhMWLidTSFFBY4FENs8ExGtRBgQmr5YJtF8fgkPcxn4TaDgSzVh3Q8fCRkaicPocVs2CtqoxVitZK99b5p1xhTTy4icXGeopS4gho8rAsHYYLdMPri4RzUQv3VWSmsWnBCHVtSAePp77ng4SCmtFooZnh9gXvWpraC8eGUbwY9pGj8bdWFcf3t8BXkLouC7yVVzGwyU1HZVYpPrKZcGjTXXmk5kpCGksKrsJUqUBYpqKpTCtQx5sSC5CGDhk8gTR5t63JEg2DTUvJzWzkN1Sz9HG6VkmsLrM3ofdvNsenmi7xEyH4FSpmA8fp7MJcQfVhzrx7G7xrHaqfZhAoz5VfHTV4wsaCJ8cRWppYkjX8vMmcyxWY3gUHAYJWrUnQc7BXQfV22ry3qTAZku9x4z16nqiJctVv8HozMeRjDjqv4snwSVTE1wRjWktWKTxkg9PWfRua7jVmunXtZwWoZd5CTL3GLy3XoAxRa9gyoX6e7unhbKT8aapzpoRg71NW646xgTecH8tmGDLw5Vwr7m92E8UeHcQeMzDm32gs4FNL367KQzC1BUoSDKwqZ8rQxhow4bqTGRdUjCBPT1aat1SEXybGao22B6oJ3aHUkv92TqxKumZxfEjxXpnBTsDQ"
      );
    });
    it("encodedPrivateKeyMultiBaseToJWK", () => {
      const eddsaMultibase =
        "zrv49NjAzAVXqpPgCi2Qc7pwPk6CBVzKDwMxdU9DrGwdosRxTiKJ1QfWQgNW5aXnLgxtCNpEAZHzJ3pJdhKtXQVJsrk";
      const eddsaJwk = encodedPrivateKeyMultiBaseToJWK("EdDSA", eddsaMultibase);
      expect(eddsaJwk.kty).toEqual("OKP");
      expect(eddsaJwk.crv).toEqual("Ed25519");
      expect(eddsaJwk.x).toEqual("mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU");
      expect(eddsaJwk.d).toEqual("r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo");

      const ecdsaMultibase =
        "z2C2CqgLYPzBgnFFpipzdcucggesArVkhfCESDo1EgWiqh7UHwCEf3gZtucgX3ApFKCCEA6xXNwqXXUXeefdtM2SVqiTBe2g6KeGoKzbJnckHPDHeNudRXqmerCBcFyUTf6u14ySz";
      const ecdsaJwk = encodedPrivateKeyMultiBaseToJWK("ES384", ecdsaMultibase);
      expect(ecdsaJwk.kty).toEqual("EC");
      expect(ecdsaJwk.crv).toEqual("P-384");
      expect(ecdsaJwk.x).toEqual(
        "HvAXo6qRLSn9yosyiMJR126nlWSCJNIhFAAVPQ4qrsqokOttWC1AvE04pmbRE777"
      );
      expect(ecdsaJwk.y).toEqual(
        "cgdrE53Vgcdkn0Q1iljf9fNnJX5LDmFoxwTTPY6iG3S01t0e-4hDlim-G-OT0zEr"
      );

      const rsaMultibase =
        "z4CbFA4s7cy8vQexwVNeC695nMRm61PF1uHntCLMG1SK1vahn57GiqXBjyVDwSrpdWF4ZJkqSD8dbYR3FZxWKyCQkFqSQsAWTeqhpiEoFpP5EpeVFBKarcE4YSpXsoSNQse55JKtxhXNuY4tn7hp2rbKBhZYy5GhMWLidTSFFBY4FENs8ExGtRBgQmr5YJtF8fgkPcxn4TaDgSzVh3Q8fCRkaicPocVs2CtqoxVitZK99b5p1xhTTy4icXGeopS4gho8rAsHYYLdMPri4RzUQv3VWSmsWnBCHVtSAePp77ng4SCmtFooZnh9gXvWpraC8eGUbwY9pGj8bdWFcf3t8BXkLouC7yVVzGwyU1HZVYpPrKZcGjTXXmk5kpCGksKrsJUqUBYpqKpTCtQx5sSC5CGDhk8gTR5t63JEg2DTUvJzWzkN1Sz9HG6VkmsLrM3ofdvNsenmi7xEyH4FSpmA8fp7MJcQfVhzrx7G7xrHaqfZhAoz5VfHTV4wsaCJ8cRWppYkjX8vMmcyxWY3gUHAYJWrUnQc7BXQfV22ry3qTAZku9x4z16nqiJctVv8HozMeRjDjqv4snwSVTE1wRjWktWKTxkg9PWfRua7jVmunXtZwWoZd5CTL3GLy3XoAxRa9gyoX6e7unhbKT8aapzpoRg71NW646xgTecH8tmGDLw5Vwr7m92E8UeHcQeMzDm32gs4FNL367KQzC1BUoSDKwqZ8rQxhow4bqTGRdUjCBPT1aat1SEXybGao22B6oJ3aHUkv92TqxKumZxfEjxXpnBTsDQ";
      const rsaJwk = encodedPrivateKeyMultiBaseToJWK("X509", rsaMultibase);
      expect(rsaJwk.kty).toEqual("RSA");
      expect(rsaJwk.n).toEqual(
        "0sQI9njoBgzaJ9zXILy-4KlGsFT_jYmgHYLm-bJzARniU0paH6FtKnChnXMlQeYDiikpY_kelsYysRywQ0Ck_1L5QDTaq5tXMvKQFCySn37zo4uQz-pzTbowuSHjEgNAOt_PnckyhNMXX9M_YYsUIcGsPA_e3Ld-y9WDPlnLUs0BAAGeipv7W0OdmXlY1wR0OcaTlIH6DlYVj9sDl_5LAfMEdwYKhTl55aIKdKL9nyn9ghpTiVb7Pt_Fpt1m4R-t1yjFEBA7FdjuphMdgB_S6m62e4PhTuwk4js6Y-IuwnOdVc-t9B9Tf3x8BPq8ABGOqBDxJnsDICDCbuptwLKr9g"
      );
      expect(rsaJwk.e).toEqual("u0lB");
      expect(rsaJwk.d).toEqual(
        "_zeKvXaa-ZZasCN39il-yXAtwYH88KFF5WGqVzbRgTjioiybvjNyp8cvpfjnuY2RMoat5Vd8uUvKZ4qvPOoYadNplEiFBD8pdpsHd7x5A2jSoH3ZgRznNDw6UbRHcsc8CH02So1xPAQ065sDnluTdSIa7Bw9D8D7ExG4zrVQ-sUvd4gRVubZ9tHlIqOkH_GZy4hnDiMaKhSS5ghFckei7g6QtRU-WdlARTaietm2VBMmP5BGMHBdEjCR82RGQw_JNjkpICSFv1F6Ky8SJdP_7N3A7iZgODKQsjXfCNceeD1MjBjlrDtzwjx0hXC7KA-9Bj9TebarmLqM3InC8rxPZQ"
      );
      expect(rsaJwk.p).toEqual(
        "-A0ZaCVSOFVQofrWY3qn6Ee7DEeakOYYR99lN_6ZKw_P8IQkXuhHWdsImgcJa5p8HOlL7rW3axiaafDRK6l7Zw"
      );
      expect(() => privateKeyMultiBaseToJWK("Unknown", "")).toThrow(
        "Unsupported key type Unknown"
      );
    });
  });
  describe("Key mapping", () => {
    it("signingAlgorithm", () => {
      expect(signingAlgorithm("EdDSA")).toEqual("EdDSA");
      expect(signingAlgorithm("ES384")).toEqual("ES384");
      expect(signingAlgorithm("X509")).toEqual("PS256");
      expect(signingAlgorithm("unknown" as unknown as "EdDSA")).toBeUndefined();
    });
    it("keyTypes", () => {
      expect(keyTypes("EdDSA")).toEqual("OKP");
      expect(keyTypes("ES384")).toEqual("EC");
      expect(keyTypes("X509")).toEqual("RSA");
      expect(keyTypes("unknown" as unknown as "EdDSA")).toBeUndefined();
    });
  });
});
