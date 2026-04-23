/**
 * Wallet SDK Example
 *
 * Demonstrates signing JWTs, managing credentials, keys, and DID.
 */
import { TsgSdk } from "@tsg-dsp/tsg-sdk";

async function main() {
  const sdk = TsgSdk.create({
    controlPlaneBaseUrl: "http://localhost:3000",
    walletBaseUrl: "http://localhost:3001",
    ssoBridgeBaseUrl: "http://localhost:3002",
    auth: {
      method: "client_secret_post",
      clientId: "my-client",
      clientSecret: "my-secret"
    }
  });

  // ── Sign a JWT ─────────────────────────────────────────────────────────
  console.log("Signing JWT...");
  const signed = await sdk.wallet.signJwt({
    body: { sub: "user-123", data: "hello world" },
    audience: "did:web:remote-participant.example.com"
  } as any);
  console.log(`Signed JWT: ${signed.jwt.substring(0, 50)}...`);

  // ── Validate a JWT ─────────────────────────────────────────────────────
  console.log("\nValidating JWT...");
  const validation = await sdk.wallet.validateJwt({
    jwt: signed.jwt
  } as any);
  console.log("Validation result:", validation);

  // ── Manage credentials ─────────────────────────────────────────────────
  console.log("\nListing credentials...");
  const credentials = await sdk.wallet.listCredentials();
  console.log(`Found ${credentials.length} credentials`);

  console.log("\nListing dataspace credentials...");
  const dsCredentials = await sdk.wallet.listDataspaceCredentials();
  console.log(`Found ${dsCredentials.length} dataspace credentials`);

  console.log("\nCredential configuration:");
  const config = await sdk.wallet.getCredentialConfig();
  console.log(JSON.stringify(config, null, 2));

  // ── Key management ─────────────────────────────────────────────────────
  console.log("\nListing keys...");
  const keys = await sdk.wallet.listKeys();
  for (const key of keys) {
    console.log(`  Key: ${key}`);
  }

  // ── DID management ─────────────────────────────────────────────────────
  console.log("\nDID Document:");
  const did = await sdk.wallet.getDidDocument();
  console.log(JSON.stringify(did, null, 2));

  console.log("\nDID Services:");
  const services = await sdk.wallet.getDidServices();
  for (const service of services) {
    console.log(`  Service: ${service}`);
  }

  // ── Credential issuance ────────────────────────────────────────────────
  // Create a credential offer
  // const offer = await sdk.wallet.createOffer({
  //   credentialType: "VerifiableCredential",
  //   credentialSubject: { ... }
  // });
  //
  // Get an offer
  // const existingOffer = await sdk.wallet.getOffer("offer-id");
  //
  // Revoke an offer
  // await sdk.wallet.revokeOffer("offer-id");
}

main().catch(console.error);
