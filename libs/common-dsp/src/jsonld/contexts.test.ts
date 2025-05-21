import { expect, test } from "@jest/globals";

import dsp from "./contexts/dsp.2025-1.js";
import health from "./contexts/health.js";
import odrl from "./contexts/odrl-profile.js";
import tsg from "./contexts/tsg.js";

test("Check JSON & TS context match", async () => {
  const { default: dspJson } = await import("./contexts/dsp.2025-1.json");
  const { default: odrlJson } = await import("./contexts/odrl-profile.json");
  const { default: healthJson } = await import("./contexts/health.json");
  const { default: tsgJson } = await import("./contexts/tsg.json");
  expect(dsp).toEqual(dspJson);
  expect(odrl).toEqual(odrlJson);
  expect(health).toEqual(healthJson);
  expect(tsg).toEqual(tsgJson);
});
