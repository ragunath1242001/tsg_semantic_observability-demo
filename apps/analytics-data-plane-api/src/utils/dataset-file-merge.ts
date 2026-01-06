import { DatasetDto, Offer, Permission } from "@tsg-dsp/common-dsp";

type MergeOptions = {
  policyAssigner?: string;
};

function structuredCloneSafe<T>(value: T): T {
  // Node 18+ has global structuredClone, but keep a fallback for tests/tooling.
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensurePolicy(dataset: DatasetDto, policyAssigner?: string): void {
  if (!policyAssigner) return;

  const hasPolicy = (dataset as unknown as { hasPolicy?: unknown }).hasPolicy;
  if (Array.isArray(hasPolicy) && hasPolicy.length > 0) return;

  const offer = new Offer({
    assigner: policyAssigner,
    permission: [new Permission({ action: "odrl:use" })]
  }).serialize(false);

  (dataset as unknown as { hasPolicy?: unknown }).hasPolicy = [offer];
}

function pickPatchDistribution(
  patch: DatasetDto
): Record<string, unknown> | undefined {
  const distribution = (patch as unknown as { distribution?: unknown })
    .distribution;
  if (!Array.isArray(distribution) || distribution.length === 0)
    return undefined;
  const first = distribution[0];
  if (!first || typeof first !== "object") return undefined;
  return first as Record<string, unknown>;
}

function ensureBaseDistribution(
  base: DatasetDto,
  patchDistribution: Record<string, unknown>
): Record<string, unknown> {
  const baseDistribution = (base as unknown as { distribution?: unknown })
    .distribution;

  const patchFormat = patchDistribution["format"];
  const patchFormatString =
    typeof patchFormat === "string" ? patchFormat : undefined;

  if (!Array.isArray(baseDistribution) || baseDistribution.length === 0) {
    (base as unknown as { distribution?: unknown }).distribution = [
      structuredCloneSafe(patchDistribution)
    ];
    return (base as unknown as { distribution: Record<string, unknown>[] })
      .distribution[0];
  }

  const baseArray = baseDistribution as Array<Record<string, unknown>>;
  let index = 0;
  if (patchFormatString) {
    const found = baseArray.findIndex(
      (d) =>
        typeof d?.["format"] === "string" && d["format"] === patchFormatString
    );
    if (found >= 0) index = found;
  }

  const existing = baseArray[index];
  if (!existing || typeof existing !== "object") {
    baseArray[index] = {};
  }
  return baseArray[index];
}

/**
 * Merge file-derived dataset updates into an existing dataset without removing
 * externally-added metadata.
 *
 * The patch is treated as a *narrow update*:
 * - updates: dataset.title, distribution.title, distribution.byteSize, distribution.mediaType, distribution.conformsTo
 * - preserves: unknown dataset-level fields (e.g., keywords, themes), policy, and other distribution fields.
 */
export function mergeFileDatasetUpdate(
  existing: DatasetDto | undefined,
  patch: DatasetDto,
  options: MergeOptions = {}
): DatasetDto {
  const base = structuredCloneSafe(existing ?? patch);

  // Preserve existing @context if present; otherwise use the patch.
  const patchContext = (patch as unknown as { "@context"?: unknown })[
    "@context"
  ];
  const baseAny = base as unknown as {
    "@context"?: unknown;
    "@id"?: unknown;
    title?: unknown;
  };
  if (baseAny["@context"] === undefined && patchContext !== undefined) {
    baseAny["@context"] = patchContext;
  }

  // Always keep the dataset id stable.
  const patchId = (patch as unknown as { "@id"?: unknown })["@id"];
  if (typeof patchId === "string") {
    baseAny["@id"] = patchId;
  }

  // Title is considered file-derived and should be updated.
  const patchTitle = (patch as unknown as { title?: unknown }).title;
  if (typeof patchTitle === "string") {
    baseAny.title = patchTitle;
  }

  const patchDistribution = pickPatchDistribution(patch);
  if (patchDistribution) {
    const baseDistribution = ensureBaseDistribution(base, patchDistribution);

    // Overwrite only the file-relevant fields.
    for (const key of ["title", "byteSize", "mediaType", "conformsTo"]) {
      if (patchDistribution[key] !== undefined) {
        baseDistribution[key] = patchDistribution[key];
      }
    }

    // Keep issued stable once set.
    if (
      baseDistribution["issued"] === undefined &&
      patchDistribution["issued"] !== undefined
    ) {
      baseDistribution["issued"] = patchDistribution["issued"];
    }

    // Access service is not file-derived; only set it if missing.
    if (
      baseDistribution["accessService"] === undefined &&
      patchDistribution["accessService"] !== undefined
    ) {
      baseDistribution["accessService"] = patchDistribution["accessService"];
    }
  }

  ensurePolicy(base, options.policyAssigner);
  return base;
}
