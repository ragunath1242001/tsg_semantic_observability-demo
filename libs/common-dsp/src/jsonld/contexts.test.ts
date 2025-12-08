import { expect, test } from "@jest/globals";

import dsp from "./contexts/dsp.2025-1.js";
import health from "./contexts/health.js";
import odrl from "./contexts/odrl-profile.js";
import credentialsv2 from "./contexts/preload/credentials.v2.js";
import dataIntegrity from "./contexts/preload/data-integrity.js";
import tsg from "./contexts/tsg.js";

test("Check JSON & TS context match", async () => {
  const { default: dspJson } = await import("./contexts/dsp.2025-1.json");
  const { default: odrlJson } = await import("./contexts/odrl-profile.json");
  const { default: healthJson } = await import("./contexts/health.json");
  const { default: tsgJson } = await import("./contexts/tsg.json");
  const { default: credentialsv2json } =
    await import("./contexts/preload/credentials.v2.json");
  const { default: dataIntegrityJson } =
    await import("./contexts/preload/data-integrity.json");

  expect(dsp).toEqual(dspJson);
  expect(odrl).toEqual(odrlJson);
  expect(health).toEqual(healthJson);
  expect(tsg).toEqual(tsgJson);
  expect(credentialsv2).toEqual(credentialsv2json);
  expect(dataIntegrity).toEqual(dataIntegrityJson);
});
