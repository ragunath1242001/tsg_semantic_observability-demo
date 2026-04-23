/**
 * Transfer SDK Example
 *
 * Demonstrates how to request, monitor, and manage data transfers.
 */
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

  // ── List existing transfers ────────────────────────────────────────────
  console.log("Existing transfers:");
  const transfers = await sdk.transfers.listTransfers();
  for (const t of transfers) {
    console.log(`  [${t}]`);
  }

  // ── Request a new transfer ─────────────────────────────────────────────
  const agreementId = "agreement-123";
  const participantId = "did:web:remote-participant.example.com";
  const remoteAddress = "http://remote-participant:3000";

  console.log("\nRequesting transfer...");
  const transfer = await sdk.transfers.requestTransfer(
    agreementId,
    participantId,
    remoteAddress,
    "application/json",
    "http-data-plane"
  );
  console.log(`Transfer created: consumer=${transfer.consumerPid}`);

  // ── Wait for transfer to start ─────────────────────────────────────────
  console.log("Waiting for transfer to start...");
  const started = await sdk.transfers.waitForStart(transfer.consumerPid, {
    intervalMs: 2000,
    maxRetries: 30
  });
  console.log(`Transfer started! State: ${started.state}`);

  // ── Complete the transfer ──────────────────────────────────────────────
  console.log("Completing transfer...");
  await sdk.transfers.completeTransfer(transfer.consumerPid);
  console.log("Transfer completed.");

  // ── Or terminate if something goes wrong ───────────────────────────────
  // await sdk.transfers.terminateTransfer(
  //   transfer.consumerPid,
  //   "ERR_TIMEOUT",
  //   "Transfer took too long"
  // );

  // ── Convenience: request + wait for start in one call ──────────────────
  // const result = await sdk.transfers.transferAndWaitForStart(
  //   agreementId,
  //   participantId,
  //   remoteAddress,
  //   "application/json",
  //   "http-data-plane"
  // );
}

main().catch(console.error);
