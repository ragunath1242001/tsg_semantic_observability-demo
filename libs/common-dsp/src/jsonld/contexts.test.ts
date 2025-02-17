import { expect, test } from "@jest/globals";

import dsp from "./contexts/dsp.2024-1.js";
import health from "./contexts/health.js";
import tsg from "./contexts/tsg.js";

test("Check JSON & TS context match", async () => {
  const { default: dspJson } = await import("./contexts/dsp.2024-1.json");
  const { default: healthJson } = await import("./contexts/health.json");
  const { default: tsgJson } = await import("./contexts/tsg.json");
  expect(dsp).toEqual(dspJson);
  expect(health).toEqual(healthJson);
  expect(tsg).toEqual(tsgJson);
});
