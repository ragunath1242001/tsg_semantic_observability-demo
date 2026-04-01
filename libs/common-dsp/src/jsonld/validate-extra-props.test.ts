import { describe, expect, test } from "vitest";

import {
  ExtraPropsValidationError,
  getKnownPrefixes,
  validateExtraProps
} from "./validate-extra-props.js";

describe("validateExtraProps (prefix-only)", () => {
  test("accepts known DCAT prefixes", async () => {
    await expect(
      validateExtraProps({
        "dcat:spatialResolutionInMeters": 10.0,
        "dct:spatial": { "@type": "dct:Location" }
      })
    ).resolves.toBeUndefined();
  });

  test("accepts known HealthDCAT-AP prefixes", async () => {
    await expect(
      validateExtraProps({
        "healthdcatap:numberOfRecords": 50000,
        "healthdcatap:minTypicalAge": 18,
        "healthdcatap:maxTypicalAge": 90
      })
    ).resolves.toBeUndefined();
  });

  test("accepts known TSG prefixes", async () => {
    await expect(
      validateExtraProps({
        "tsg:customProp": "value",
        "csvw:tableSchema": {}
      })
    ).resolves.toBeUndefined();
  });

  test("rejects unknown prefixes", async () => {
    await expect(
      validateExtraProps({
        "unknown:property": "value"
      })
    ).rejects.toThrow(ExtraPropsValidationError);
  });

  test("rejects geodcat prefix (not in default contexts)", async () => {
    await expect(
      validateExtraProps({
        "geodcat:custodian": { "@type": "foaf:Organization" }
      })
    ).rejects.toThrow(ExtraPropsValidationError);
  });

  test("reports all unknown prefixes in error", async () => {
    try {
      await validateExtraProps({
        "foo:bar": "value",
        "baz:qux": "value",
        "dcat:theme": "known"
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ExtraPropsValidationError);
      expect((e as ExtraPropsValidationError).unknownKeys).toContain("foo:bar");
      expect((e as ExtraPropsValidationError).unknownKeys).toContain("baz:qux");
    }
  });

  test("ignores keys without prefix separator", async () => {
    await expect(
      validateExtraProps({
        simpleKey: "value"
      })
    ).resolves.toBeUndefined();
  });

  test("ignores full IRI keys", async () => {
    await expect(
      validateExtraProps({
        "http://example.org/property": "value",
        "https://example.org/other": "value"
      })
    ).resolves.toBeUndefined();
  });

  test("rejects unknown prefixes nested in objects", async () => {
    await expect(
      validateExtraProps({
        "dct:spatial": {
          "@type": "dct:Location",
          "geodcat:custodian": { "@type": "foaf:Organization" }
        }
      })
    ).rejects.toThrow(ExtraPropsValidationError);
  });

  test("reports full path for nested unknown prefixes", async () => {
    try {
      await validateExtraProps({
        "dct:spatial": {
          "unknown:nested": "value"
        }
      });
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ExtraPropsValidationError);
      expect((e as ExtraPropsValidationError).unknownKeys).toContain(
        "dct:spatial.unknown:nested"
      );
    }
  });
});

describe("getKnownPrefixes", () => {
  test("includes core prefixes", () => {
    const prefixes = getKnownPrefixes();
    expect(prefixes.has("dcat")).toBe(true);
    expect(prefixes.has("dct")).toBe(true);
    expect(prefixes.has("odrl")).toBe(true);
    expect(prefixes.has("dspace")).toBe(true);
    expect(prefixes.has("xsd")).toBe(true);
  });

  test("includes TSG prefixes", () => {
    const prefixes = getKnownPrefixes();
    expect(prefixes.has("tsg")).toBe(true);
    expect(prefixes.has("iana")).toBe(true);
    expect(prefixes.has("csvw")).toBe(true);
    expect(prefixes.has("dqv")).toBe(true);
  });

  test("includes Health prefixes", () => {
    const prefixes = getKnownPrefixes();
    expect(prefixes.has("healthdcatap")).toBe(true);
    expect(prefixes.has("prov")).toBe(true);
    expect(prefixes.has("heracles")).toBe(true);
  });
});

describe("validateExtraProps (with compaction)", () => {
  test("valid HealthDCAT-AP properties survive expansion", async () => {
    await expect(
      validateExtraProps(
        {
          "healthdcatap:numberOfRecords": 50000,
          "healthdcatap:minTypicalAge": 18,
          "healthdcatap:maxTypicalAge": 90
        },
        { compaction: true }
      )
    ).resolves.toBeUndefined();
  });

  test("valid DCAT spatial properties survive expansion", async () => {
    await expect(
      validateExtraProps(
        {
          "dcat:spatialResolutionInMeters": 10.0,
          "dcat:temporalResolution": "P1D"
        },
        { compaction: true }
      )
    ).resolves.toBeUndefined();
  });

  test("rejects properties with unknown prefixes", async () => {
    await expect(
      validateExtraProps(
        {
          "unknown:property": "value"
        },
        { compaction: true }
      )
    ).rejects.toThrow(ExtraPropsValidationError);
  });

  test("rejects nested objects with unresolvable keys", async () => {
    await expect(
      validateExtraProps(
        {
          "dct:spatial": {
            unknownNestedKey: "value"
          }
        },
        { compaction: true }
      )
    ).rejects.toThrow(ExtraPropsValidationError);
  });

  test("accepts nested objects where all keys resolve", async () => {
    await expect(
      validateExtraProps(
        {
          "dct:spatial": {
            "@type": "dct:Location",
            "dcat:bbox": "POLYGON((...))"
          }
        },
        { compaction: true }
      )
    ).resolves.toBeUndefined();
  });

  test("rejects deeply nested unresolvable keys", async () => {
    try {
      await validateExtraProps(
        {
          "dct:spatial": {
            "@type": "dct:Location",
            "dcat:bbox": "POLYGON((...))",
            badKey: {
              anotherBadKey: "value"
            }
          }
        },
        { compaction: true }
      );
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ExtraPropsValidationError);
    }
  });

  test("accepts full IRI keys in nested objects", async () => {
    await expect(
      validateExtraProps(
        {
          "https://example.org/custom": {
            "@value": "test"
          }
        },
        { compaction: true }
      )
    ).resolves.toBeUndefined();
  });
});
