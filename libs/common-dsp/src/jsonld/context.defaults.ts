import dsp from "./contexts/dsp.2024-1.js";
import tsg from "./contexts/tsg.js";
import health from "./contexts/health.js";
import { JsonLd } from "jsonld/jsonld-spec.js";

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

export const dspContextUrl = "https://w3id.org/dspace/2024/1/context.json";

export const tsgContextUrl = (version?: string) =>
  `https://tsg.dataspac.es/contexts/${
    (version ?? debugContexts) ? "next" : currentVersion
  }/tsg.json`;

export const healthContextUrl = (version?: string) =>
  `https://tsg.dataspac.es/contexts/${
    (version ?? debugContexts) ? "next" : currentVersion
  }/health.json`;

export const dspContext: JsonLd = <JsonLd>dsp;

export const tsgContext: JsonLd = <JsonLd>tsg;

export const healthContext: JsonLd = <JsonLd>health;
