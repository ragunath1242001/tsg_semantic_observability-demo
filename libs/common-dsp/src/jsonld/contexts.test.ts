import { expect, test } from "@jest/globals";

test("Check JSON & TS context match", () => {
  expect(require("./contexts/dsp.2024-1").default).toStrictEqual(
    require("./contexts/dsp.2024-1.json")
  );
  expect(require("./contexts/tsg").default).toStrictEqual(
    require("./contexts/tsg.json")
  );
  expect(require("./contexts/health").default).toStrictEqual(
    require("./contexts/health.json")
  );
});
