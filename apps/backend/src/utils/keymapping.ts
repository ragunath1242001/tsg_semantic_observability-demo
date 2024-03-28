export function signingAlgorithm(type: "EdDSA" | "ES384" | "X509"): string {
  switch (type) {
    case "EdDSA":
      return "EdDSA";
    case "ES384":
      return "ES384";
    case "X509":
      return "PS256";
  }
}
export function keyTypes(type: "EdDSA" | "ES384" | "X509"): string {
  switch (type) {
    case "EdDSA":
      return "OKP";
    case "ES384":
      return "EC";
    case "X509":
      return "RSA";
  }
}
