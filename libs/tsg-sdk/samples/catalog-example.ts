/**
 * Catalog SDK Example
 *
 * Demonstrates how to browse catalogs, discover participants,
 * and search for datasets using the TSG SDK.
 */
import { SdkError, SdkErrorCode, TsgSdk } from "@tsg-dsp/tsg-sdk";

async function main() {
  // Create SDK with minimal config (no auth — for testing/local dev)
  const sdk = TsgSdk.create({
    controlPlaneBaseUrl: "http://localhost:3000"
  });

  // ── Browse own catalog ─────────────────────────────────────────────────
  console.log("Fetching own catalog...");
  const ownCatalog = await sdk.catalog.getOwnCatalog();
  console.log(`Own catalog has ${ownCatalog.dataset?.length ?? 0} datasets`);

  // Get raw DTO form (no deserialization into class instances)
  const ownCatalogDto = await sdk.catalog.getOwnCatalog(true);
  console.log("Participant ID:", ownCatalogDto.participantId);

  // ── Discover participants ──────────────────────────────────────────────
  console.log("\nDiscovering participants...");
  await sdk.catalog.refreshRegistry();
  const addresses = await sdk.catalog.getRegistryAddresses();
  console.log(`Found ${addresses.length} participants in registry`);

  // ── Browse remote catalog ──────────────────────────────────────────────
  for (const participant of addresses) {
    console.log(`\nFetching catalog for ${participant}...`);
    try {
      const catalog = await sdk.catalog.getParticipantCatalog(
        String(participant),
        true
      );
      console.log(`  ${catalog.dataset?.length ?? 0} datasets available`);
    } catch (error) {
      if (error instanceof SdkError && error.code === SdkErrorCode.NOT_FOUND) {
        console.log("  Participant not reachable");
      } else {
        throw error;
      }
    }
  }

  // ── Search for datasets by conformance ─────────────────────────────────
  const targetParticipant = "did:web:example.com";
  try {
    const dataset = await sdk.catalog.getDatasetConformingTo(
      "https://w3id.org/dspace/v1.0/CatalogProtocol",
      targetParticipant,
      true
    );
    console.log(`\nFound dataset: ${dataset["@id"]}`);
  } catch (error) {
    if (error instanceof SdkError && error.code === SdkErrorCode.NOT_FOUND) {
      console.log("\nNo matching dataset found");
    }
  }

  // ── List dataplanes ────────────────────────────────────────────────────
  console.log("\nConfigured dataplanes:");
  const dataplanes = await sdk.catalog.getDataplanes();
  for (const dp of dataplanes) {
    console.log(`  - ${dp}`);
  }
}

main().catch(console.error);
