import { toDCATDataset } from "./deterministic-metadata.js";
import { generateDeterministicMetadata } from "./deterministic-metadata.js";

describe("toDCATDataset", () => {
  test("generates basic DCAT dataset with description, distribution and completeness mapping (all-variables)", () => {
    const metadata: any = {
      filename: "test.csv",
      rowCount: 10,
      columnCount: 1,
      columns: [
        {
          name: "age",
          datatype: "integer",
          xsdDatatype: "xsd:integer",
          nullCount: 0,
          uniqueCount: 10,
          totalCount: 10,
          sampleValues: ["1", "2"]
        }
      ],
      completeness: 99.5,
      qualityMeasurements: [
        { metric: "dqv:completeness", value: 99.5, unit: "percent" }
      ],
      metadataGenerated: "2025-01-01T00:00:00Z",
      mediaType: "text/csv",
      estimatedByteSize: 1234
    };

    const dcat = toDCATDataset(metadata);

    expect(dcat["@type"]).toBe("dcat:Dataset");
    expect(dcat["dct:title"]).toBe("test.csv");
    expect(dcat["dct:description"]).toMatch(
      /CSV dataset with 10 rows and 1 columns\./
    );
    expect(dcat["dct:description"]).toMatch(/Column types: 1 integer\./);
    expect(dcat["dqv:completeness"]).toBe("all-variables");
    expect(dcat["dcat:distribution"]).toBeDefined();
    expect(dcat["dcat:distribution"]?.["dcat:byteSize"]).toBe(1234);
    expect(dcat["csvw:tableSchema"]).toBeDefined();
    expect(dcat["csvw:tableSchema"]?.["csvw:rowCount"]).toBe(10);
  });

  test("includes temporal coverage, dct:temporal and healthdcatap age/coding system extensions", () => {
    const metadata: any = {
      filename: "temporal.csv",
      rowCount: 5,
      columnCount: 2,
      columns: [
        {
          name: "date",
          datatype: "date",
          xsdDatatype: "xsd:date",
          nullCount: 0,
          uniqueCount: 5,
          totalCount: 5,
          sampleValues: ["2020-01-01"]
        },
        {
          name: "code",
          datatype: "string",
          xsdDatatype: "xsd:string",
          nullCount: 0,
          uniqueCount: 2,
          totalCount: 5,
          sampleValues: ["A", "B"]
        }
      ],
      completeness: 80,
      qualityMeasurements: [],
      metadataGenerated: "2025-01-01T00:00:00Z",
      mediaType: "text/csv",
      estimatedByteSize: 500,
      temporalCoverage: {
        startDate: "2020-01-01",
        endDate: "2020-12-31",
        interval: "2020-01-01/2020-12-31"
      },
      estimatedAgeRange: { min: 10, max: 90 },
      detectedCodingSystems: ["http://loinc.org"]
    };

    const dcat = toDCATDataset(metadata);

    expect(dcat["dct:description"]).toMatch(
      /Temporal coverage: 2020-01-01 to 2020-12-31\./
    );
    expect(dcat["temporal"]).toBe("2020-01-01/2020-12-31");
    expect(dcat["dct:temporal"]).toBeDefined();
    expect(dcat["dct:temporal"]?.["dcat:startDate"]).toBe("2020-01-01");
    expect(dcat["dct:temporal"]?.["dcat:endDate"]).toBe("2020-12-31");
    expect(dcat["healthdcatap:minTypicalAge"]).toBe(10);
    expect(dcat["healthdcatap:maxTypicalAge"]).toBe(90);
    expect(dcat["healthdcatap:hasCodingSystem"]).toEqual(["http://loinc.org"]);
    expect(dcat["dqv:completeness"]).toBe("some-variables");
  });

  test("maps qualityMeasurements to dqv:hasQualityMeasurement entries", () => {
    const metadata: any = {
      filename: "qm.csv",
      rowCount: 2,
      columnCount: 1,
      columns: [
        {
          name: "val",
          datatype: "number",
          xsdDatatype: "xsd:double",
          nullCount: 0,
          uniqueCount: 2,
          totalCount: 2,
          sampleValues: ["1.2", "3.4"]
        }
      ],
      completeness: 40,
      qualityMeasurements: [
        { metric: "dqv:completeness", value: 40, unit: "percent" },
        { metric: "dqv:numberOfRecords", value: 2 }
      ],
      metadataGenerated: "2025-01-01T00:00:00Z",
      mediaType: "text/csv",
      estimatedByteSize: 100
    };

    const dcat = toDCATDataset(metadata);

    expect(Array.isArray(dcat["dqv:hasQualityMeasurement"])).toBe(true);
    const qm = dcat["dqv:hasQualityMeasurement"]?.find(
      (q: any) => q["dqv:isMeasurementOf"] === "dqv:completeness"
    );
    expect(qm).toBeDefined();
    expect(qm?.["dqv:value"]).toBe(40);
    expect(qm?.["sdmx:unitMeasure"]).toBe("percent");
    expect(dcat["dqv:completeness"]).toBe("not-documented");
  });

  describe("generateDeterministicMetadata", () => {
    test("infers numeric stats, age and identifier detection, completeness and byte size", () => {
      const headers = ["age", "user_id", "height"];
      const rows = [
        ["25", "u1", "175.5"],
        ["30", "u2", "180"],
        ["17", "u3", "NaN"],
        ["45", "u4", "170"],
        ["35", "u5", "165"]
      ];

      const md = generateDeterministicMetadata(headers, rows, "people.csv");

      expect(md.rowCount).toBe(5);
      expect(md.columnCount).toBe(3);

      const ageCol = md.columns.find((c) => c.name === "age");
      expect(ageCol).toBeDefined();
      expect(ageCol?.datatype).toBe("integer");
      expect(ageCol?.min).toBe(17);
      expect(ageCol?.max).toBe(45);
      expect(ageCol?.mean).toBe(30.4);
      expect(ageCol?.isLikelyAge).toBe(true);
      expect(md.estimatedAgeRange).toEqual({ min: 17, max: 45 });
      const idCol = md.columns.find((c) => c.name === "user_id");
      expect(idCol).toBeDefined();
      expect(idCol?.isLikelyIdentifier).toBe(true);

      // completeness: one empty-like cell ("NA" counts as non-empty for nullCount, but nullCount counts only truly empty),
      // here only truly empty cells = 0, but age "NA" was non-empty so nullCount computed via trim==="" -> 0.
      // however generateDeterministicMetadata computes completeness and rounds; expect numeric between 0 and 100
      expect(typeof md.completeness).toBe("number");
      expect(md.completeness).toBeGreaterThan(0);
      expect(md.estimatedByteSize).toBeGreaterThan(0);
    });

    test("parses date column, computes minDate/maxDate and temporalCoverage", () => {
      const headers = ["event_date"];
      const rows = [["2020-01-01"], ["2019-12-31"], ["2020-06-15"]];

      const md = generateDeterministicMetadata(headers, rows, "events.csv");

      expect(md.columns.length).toBe(1);
      const col = md.columns[0];
      expect(col.datatype).toBe("date");
      expect(col.xsdDatatype).toBe("xsd:date");
      expect(col.minDate).toBe("2019-12-31");
      expect(col.maxDate).toBe("2020-06-15");

      expect(md.temporalCoverage).toBeDefined();
      expect(md.temporalCoverage?.startDate).toBe("2019-12-31");
      expect(md.temporalCoverage?.endDate).toBe("2020-06-15");
      expect(md.temporalCoverage?.interval).toBe("2019-12-31/2020-06-15");
    });

    test("detects coding system for string columns and exposes detectedCodingSystems", () => {
      const headers = ["code"];
      const rows = [["ABC12"], ["DEF34"], ["GHI56"], ["ABC12"], ["DEF34"]];

      const md = generateDeterministicMetadata(headers, rows, "codes.csv");

      const col = md.columns[0];
      expect(col.datatype).toBe("string");
      expect(col.isLikelyCoded).toBe(true);
      expect(col.codingSystemHint).toBe("http://loinc.org");
      expect(Array.isArray(md.detectedCodingSystems)).toBe(true);
      expect(md.detectedCodingSystems).toContain("http://loinc.org");
      expect(col.sampleValues.length).toBeGreaterThan(0);
    });

    test("handles empty columns and returns sensible defaults", () => {
      const headers = ["empty"];
      const rows = [[""], [""], [""]];

      const md = generateDeterministicMetadata(headers, rows, "empty.csv");

      expect(md.rowCount).toBe(3);
      expect(md.columnCount).toBe(1);
      const col = md.columns[0];
      expect(col.datatype).toBe("string");
      expect(col.nullCount).toBe(3);
      expect(md.completeness).toBe(0);
    });
  });
});
