/**
 * End-to-End Example: Data Sharing Workflow
 *
 * This example demonstrates a complete data-sharing workflow using
 * multiple SDK modules together:
 *
 * 1. Discover participants via the registry
 * 2. Browse a remote participant's catalog
 * 3. Find a target dataset
 * 4. Negotiate a contract for the dataset
 * 5. Transfer the data once the agreement is reached
 *
 * This is a "consumer-side" workflow — the SDK user is requesting
 * data from a remote participant.
 */
import { type OfferDto } from "@tsg-dsp/common-dsp";
import { SdkError, SdkErrorCode, TsgSdk } from "@tsg-dsp/tsg-sdk";

// ── Configuration ────────────────────────────────────────────────────────
const CONFIG = {
  controlPlaneBaseUrl: "http://localhost:3000",
  walletBaseUrl: "http://localhost:3001",
  ssoBridgeBaseUrl: "http://localhost:3002",
  auth: {
    method: "client_secret_post" as const,
    clientId: "my-client",
    clientSecret: "my-secret"
  }
};

// The schema/standard of the dataset we're looking for
const TARGET_CONFORMANCE = "https://example.org/schemas/energy-data";

async function main() {
  // ── Step 0: Initialize SDK ─────────────────────────────────────────────
  const sdk = TsgSdk.create(CONFIG);
  console.log("SDK initialized.\n");

  // ── Step 1: Discover participants ──────────────────────────────────────
  console.log("Step 1: Discovering participants...");
  await sdk.catalog.refreshRegistry();
  const participants = await sdk.catalog.getRegistryAddresses();
  console.log(`  Found ${participants.length} participants in the registry.\n`);

  if (participants.length === 0) {
    console.log("No participants found. Exiting.");
    return;
  }

  // ── Step 2: Find a dataset matching our requirements ───────────────────
  console.log("Step 2: Searching for target dataset...");
  let targetDataset: any = null;
  let targetParticipantId: string | null = null;
  let targetAddress: string | null = null;

  for (const participant of participants) {
    const participantId = String(participant);
    try {
      const dataset = await sdk.catalog.getDatasetConformingTo(
        TARGET_CONFORMANCE,
        participantId,
        true
      );
      targetDataset = dataset;
      targetParticipantId = participantId;
      // In a real scenario you'd get the address from the registry entry
      targetAddress = `http://${participantId}`;
      console.log(
        `  Found matching dataset "${dataset["@id"]}" at ${participantId}\n`
      );
      break;
    } catch (error) {
      if (error instanceof SdkError && error.code === SdkErrorCode.NOT_FOUND) {
        continue; // Try next participant
      }
      throw error;
    }
  }

  if (!targetDataset || !targetParticipantId || !targetAddress) {
    console.log("No matching dataset found across participants. Exiting.");
    return;
  }

  // ── Step 3: Negotiate a contract ───────────────────────────────────────
  console.log("Step 3: Negotiating contract...");

  // Extract the offer from the dataset
  const offer: OfferDto = targetDataset.hasPolicy?.[0] ?? {
    "@type": "Offer",
    "@id": `offer-${Date.now()}`,
    target: targetDataset["@id"],
    permission: [{ action: "use", constraint: [] }]
  };

  const negotiation = await sdk.negotiations.requestNegotiation(
    targetDataset["@id"],
    targetParticipantId,
    targetAddress,
    offer
  );
  console.log(`  Negotiation created: ${negotiation.id}`);

  // Wait for the provider to accept and finalize the agreement
  console.log("  Waiting for agreement...");
  const finalized = await sdk.negotiations.waitForAgreement(
    negotiation.id,
    { intervalMs: 2000, maxRetries: 60 } // Wait up to 2 minutes
  );
  console.log(`  Agreement reached: ${finalized.agreement}\n`);

  // ── Step 4: Request a data transfer ────────────────────────────────────
  console.log("Step 4: Requesting data transfer...");
  const dataplanes = await sdk.catalog.getDataplanes();
  const dataPlaneIdentifier = String(dataplanes[0] ?? "http-data-plane");

  const transfer = await sdk.transfers.requestTransfer(
    String(finalized.agreement),
    targetParticipantId,
    targetAddress,
    "application/json",
    dataPlaneIdentifier
  );
  console.log(`  Transfer requested: ${transfer.consumerPid}`);

  // Wait for the transfer to start
  console.log("  Waiting for transfer to start...");
  const started = await sdk.transfers.waitForStart(transfer.consumerPid, {
    intervalMs: 2000,
    maxRetries: 30
  });
  console.log(`  Transfer started! State: ${started.state}`);

  // ── Step 5: Data is now flowing ────────────────────────────────────────
  console.log("\nData transfer is active.");
  console.log("The data plane will handle the actual data exchange.");
  console.log("Once processing is complete, complete the transfer:\n");

  // Complete the transfer when done
  await sdk.transfers.completeTransfer(transfer.consumerPid);
  console.log("Transfer completed successfully!");

  // ── Optional: Sign a receipt with the wallet ───────────────────────────
  // const receipt = await sdk.wallet.signJwt({
  //   body: {
  //     agreementId: finalized.agreement,
  //     transferId: transfer.consumerPid,
  //     completedAt: new Date().toISOString(),
  //   },
  //   audience: targetParticipantId,
  // });
  // console.log(`\nSigned receipt: ${receipt.jwt}`);
}

main().catch((error) => {
  if (error instanceof SdkError) {
    console.error(`SDK Error [${error.code}]: ${error.message}`);
    if (error.statusCode) {
      console.error(`  HTTP Status: ${error.statusCode}`);
    }
  } else {
    console.error("Unexpected error:", error);
  }
  process.exit(1);
});
