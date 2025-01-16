import { Logger } from "@nestjs/common";
import { TransformFnParams } from "class-transformer";
import fs from "fs";

export const fileTransformer = (
  params: TransformFnParams
): string | undefined => {
  if (typeof params.value === "string") {
    if (params.value.startsWith("file:")) {
      try {
        return fs.readFileSync(params.value.slice(5)).toString();
      } catch (err) {
        Logger.warn(`Could not load ${params.value}: ${err}`, "Config");
        return undefined;
      }
    }
    return params.value;
  }
  return `${params.value}`;
};

export const valueToBoolean = (
  params: TransformFnParams
): boolean | undefined => {
  if (params.value === null || params.value === undefined) {
    return undefined;
  }
  if (typeof params.value === "boolean") {
    return params.value;
  }
  if (["true", "on", "yes", "1"].includes(params.value.toLowerCase())) {
    return true;
  }
  if (["false", "off", "no", "0"].includes(params.value.toLowerCase())) {
    return false;
  }
  return undefined;
};
