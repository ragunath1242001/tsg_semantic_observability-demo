/**
 * Negotiation SDK Example
 *
 * Demonstrates how to negotiate contracts for datasets,
 * monitor negotiation state, and retrieve agreements.
 */
import { type OfferDto } from "@tsg-dsp/common-dsp";
import { TsgSdk } from "@tsg-dsp/tsg-sdk";

async function main() {
  const sdk = TsgSdk.create({
    controlPlaneBaseUrl: "http://localhost:3000",
    ssoBridgeBaseUrl: "http://localhost:3002",
    auth: {
      method: "client_secret_post",
      clientId: "my-client",
      clientSecret: "my-secret"
    }
  });

  // ── List existing negotiations ─────────────────────────────────────────
  console.log("Existing negotiations:");
  const negotiations = await sdk.negotiations.listNegotiations();
  for (const n of negotiations) {
    console.log(`  [${n}]`);
  }

  // ── Request a new negotiation ──────────────────────────────────────────
  const datasetId = "dataset-123";
  const participantId = "did:web:remote-participant.example.com";
  const remoteAddress = "http://remote-participant:3000";

  // The offer describes the policy under which we want to use the dataset
  const offer: OfferDto = {
    "@type": "Offer",
    "@id": `offer-${Date.now()}`,
    target: datasetId,
    assigner: participantId,
    permission: [
      {
        action: "use",
        constraint: []
      }
    ]
  } as unknown as OfferDto;

  console.log("\nRequesting negotiation...");
  const negotiation = await sdk.negotiations.requestNegotiation(
    datasetId,
    participantId,
    remoteAddress,
    offer
  );
  console.log(`Negotiation created: ${negotiation.id}`);

  // ── Wait for agreement ─────────────────────────────────────────────────
  console.log("Waiting for agreement...");
  const finalized = await sdk.negotiations.waitForAgreement(negotiation.id, {
    intervalMs: 2000,
    maxRetries: 30
  });
  console.log(`Negotiation finalized! Agreement ID: ${finalized.agreement}`);

  // ── Retrieve the agreement ─────────────────────────────────────────────
  if (finalized.agreement) {
    const agreement = await sdk.negotiations.getAgreement(
      String(finalized.agreement),
      true
    );
    console.log("Agreement details:", JSON.stringify(agreement, null, 2));
  }

  // ── Convenience: negotiate and wait in one call ────────────────────────
  // const result = await sdk.negotiations.negotiateAndWait(
  //   datasetId,
  //   participantId,
  //   remoteAddress,
  //   offer,
  //   { intervalMs: 2000, maxRetries: 30 }
  // );
}

main().catch(console.error);
