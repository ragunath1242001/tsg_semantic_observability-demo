import { JsonLd } from "jsonld/jsonld-spec.js";

import dsp from "./contexts/dsp.2025-1.js";
import health from "./contexts/health.js";
import odrl from "./contexts/odrl-profile.js";
import tsg from "./contexts/tsg.js";

const getOptionalEnv = (key: string, defaultValue: string) => {
  if (typeof process === "undefined") {
    return defaultValue;
  }
  return process.env[key] ?? defaultValue;
};

let debugContexts = getOptionalEnv("TSG_MODE", "development") !== "production";
let currentVersion = getOptionalEnv("TSG_VERSION", "0.0.0");

export const setJsonLdDebugContexts = (debug: boolean, useVersion?: string) => {
  debugContexts = debug;
  if (useVersion && useVersion.trim() !== "") {
    currentVersion = useVersion;
  }
};

export const defaultContext = () => [
  dspContextUrl,
  tsgContextUrl(),
  healthContextUrl()
];

export const dspContextUrl = "https://w3id.org/dspace/2025/1/context.jsonld";

export const dspOdrlProfileContextUrl =
  "https://w3id.org/dspace/2025/1/odrl-profile.jsonld";

export const tsgContextUrl = (version?: string) =>
  `https://tsg.dataspac.es/contexts/${
    (version ?? debugContexts) ? "next" : currentVersion
  }/tsg.json`;

export const healthContextUrl = (version?: string) =>
  `https://tsg.dataspac.es/contexts/${
    (version ?? debugContexts) ? "next" : currentVersion
  }/health.json`;

export const dspContext: JsonLd = dsp as unknown as JsonLd;

export const dspOdrlProfileContext: JsonLd = <JsonLd>odrl;

export const dereferencedDspContext: JsonLd = (() => {
  const dspStringContext = JSON.stringify(dsp);
  const odrlProfileStringContext = JSON.stringify(odrl["@context"]).slice(
    1,
    -1
  );

  const dereferencedDspContext = dspStringContext.replaceAll(
    '"@import":"https://w3id.org/dspace/2025/1/odrl-profile.jsonld"',
    odrlProfileStringContext
  );

  return JSON.parse(dereferencedDspContext) as JsonLd;
})();

export const tsgContext: JsonLd = <JsonLd>tsg;

export const healthContext: JsonLd = <JsonLd>health;
