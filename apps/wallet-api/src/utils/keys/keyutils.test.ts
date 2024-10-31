import { JWK } from "jose";
import {
  jwkToMultibase,
  encodedPublicKeyMultiBaseToJWK,
  publicKeyMultiBaseToJWK,
} from "./keyconverter.js";
import { cryptoSuiteFromJws, getCryptoSuite } from "./cryptosuite.js";

describe("Key Utils test", () => {
  it("Cryptosuites", () => {
    expect(getCryptoSuite("EdDSA", "RDFC")).toEqual("eddsa-rdfc-2022");
    expect(getCryptoSuite("EdDSA", "JCS")).toEqual("eddsa-jcs-2022");
    expect(getCryptoSuite("ES384", "RDFC")).toEqual("ecdsa-rdfc-2019");
    expect(getCryptoSuite("ES384", "JCS")).toEqual("ecdsa-jcs-2019");
    expect(getCryptoSuite("X509", "RDFC")).toEqual("RSASSA-PSS");
    expect(getCryptoSuite("X509", "JCS")).toEqual("RSASSA-PSS");

    expect(cryptoSuiteFromJws(`eyJhbGciOiJFZERTQSJ9..`)).toEqual(
      "eddsa-rdfc-2022",
    );
    expect(cryptoSuiteFromJws(`eyJhbGciOiJFUzM4NCJ9..`)).toEqual(
      "ecdsa-rdfc-2019",
    );
    expect(cryptoSuiteFromJws(`eyJhbGciOiJQUzI1NiJ9..`)).toEqual("RSASSA-PSS");
  });
  describe("Key conversion", () => {
    it("EDDSA", () => {
      const jwk: JWK = {
        crv: "Ed25519",
        d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo",
        x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
        kty: "OKP",
      };
      const publicMultibase = jwkToMultibase(jwk, false);
      expect(publicMultibase).toEqual(
        "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz",
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "zrv49NjAzAVXqpPgCi2Qc7pwPk6CBVzKDwMxdU9DrGwdosRxTiKJ1QfWQgNW5aXnLgxtCNpEAZHzJ3pJdhKtXQVJsrk",
      );

      const parsedJwk = encodedPublicKeyMultiBaseToJWK(
        "eddsa-jcs-2022",
        publicMultibase,
      );
      expect(parsedJwk.x).toEqual(jwk.x);

      expect(() => jwkToMultibase({ ...jwk, crv: "Unknown" }, false)).toThrow(
        "The JWK curve algorithm (crv) Unknown is not supported for OKP key type (kty)",
      );
    });
    it("ES384", () => {
      const jwk: JWK = {
        kty: "EC",
        x: "HvAXo6qRLSn9yosyiMJR126nlWSCJNIhFAAVPQ4qrsqokOttWC1AvE04pmbRE777",
        y: "cgdrE53Vgcdkn0Q1iljf9fNnJX5LDmFoxwTTPY6iG3S01t0e-4hDlim-G-OT0zEr",
        crv: "P-384",
        d: "QkdL2rGZbUz0o2Nm-UsQIdN_bq4VTtY6S0dAjb61304tpbnj6f-vxQ_orkmxJf7o",
      };
      const publicMultibase = jwkToMultibase(jwk, false);
      expect(publicMultibase).toEqual(
        "z82Lkw3cH1MH4UcpQWywAV9ceiBue8SGahy9JFYGLY3xzWX5dm5nf9Hs4k7KfMoUFaPQGUi",
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "z2C2CqgLYPzBgnFFpipzdcucggesArVkhfCESDo1EgWiqh7UHwCEf3gZtucgX3ApFKCCEA6xXNwqXXUXeefdtM2SVqiTBe2g6KeGoKzbJnckHPDHeNudRXqmerCBcFyUTf6u14ySz",
      );
      const parsedJwk = encodedPublicKeyMultiBaseToJWK(
        "ecdsa-jcs-2019",
        publicMultibase,
      );
      expect(parsedJwk.x).toEqual(jwk.x);
      expect(parsedJwk.y).toEqual(jwk.y);
      expect(() => jwkToMultibase({ ...jwk, crv: "Unknown" }, false)).toThrow(
        "The JWK curve algorithm (crv) Unknown is not supported for EC key type (kty)",
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
        qi: "-A0ZaCVSOFVQofrWY3qn6Ee7DEeakOYYR99lN_6ZKw_P8IQkXuhHWdsImgcJa5p8HOlL7rW3axiaafDRK6l7Zw",
      };
      const publicMultibase = jwkToMultibase(jwk, false);
      expect(publicMultibase).toEqual(
        "z7nWgPwHFV3kXMZeUEJZ1jcPWDWEY2vtP4BiTmBGWKmucTUi7MLWQU6GYTTmvcKiTvUnZuRg9HE4iHEvrC1Qujx8R4WyDJCmoj4qA8YmtmdpUmwANdsBdrwk3BqZXphRAZnGhRdMM8dzmqusUDGdzuzkx9UVYf7pBGCc3bjF3pBRMCqRjBgqJDv",
      );
      const privateMultibase = jwkToMultibase(jwk, true);
      expect(privateMultibase).toEqual(
        "z4CbFA4s7cy8vQexwVNeC695nMRm61PF1uHntCLMG1SK1vahn57GiqXBjyVDwSrpdWF4ZJkqSD8dbYR3FZxWKyCQkFqSQsAWTeqhpiEoFpP5EpeVFBKarcE4YSpXsoSNQse55JKtxhXNuY4tn7hp2rbKBhZYy5GhMWLidTSFFBY4FENs8ExGtRBgQmr5YJtF8fgkPcxn4TaDgSzVh3Q8fCRkaicPocVs2CtqoxVitZK99b5p1xhTTy4icXGeopS4gho8rAsHYYLdMPri4RzUQv3VWSmsWnBCHVtSAePp77ng4SCmtFooZnh9gXvWpraC8eGUbwY9pGj8bdWFcf3t8BXkLouC7yVVzGwyU1HZVYpPrKZcGjTXXmk5kpCGksKrsJUqUBYpqKpTCtQx5sSC5CGDhk8gTR5t63JEg2DTUvJzWzkN1Sz9HG6VkmsLrM3ofdvNsenmi7xEyH4FSpmA8fp7MJcQfVhzrx7G7xrHaqfZhAoz5VfHTV4wsaCJ8cRWppYkjX8vMmcyxWY3gUHAYJWrUnQc7BXQfV22ry3qTAZku9x4z16nqiJctVv8HozMeRjDjqv4snwSVTE1wRjWktWKTxkg9PWfRua7jVmunXtZwWoZd5CTL3GLy3XoAxRa9gyoX6e7unhbKT8aapzpoRg71NW646xgTecH8tmGDLw5Vwr7m92E8UeHcQeMzDm32gs4FNL367KQzC1BUoSDKwqZ8rQxhow4bqTGRdUjCBPT1aat1SEXybGao22B6oJ3aHUkv92TqxKumZxfEjxXpnBTsDQ",
      );

      const parsedJwk = encodedPublicKeyMultiBaseToJWK(
        "RSASSA-PSS",
        publicMultibase,
      );
      expect(parsedJwk.n).toEqual(jwk.n);
      expect(parsedJwk.e).toEqual(jwk.e);
    });
    it("Unsupported type", () => {
      expect(() => jwkToMultibase({ kty: "unknown" }, false)).toThrow(
        "The JWK key type (kty) unknown is not supported",
      );
      expect(() => publicKeyMultiBaseToJWK("unknown", "")).toThrow(
        "Unsupported cryptosuite type unknown",
      );
    });
  });
});
