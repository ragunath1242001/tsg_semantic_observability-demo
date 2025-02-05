import { PolicyConfig } from "@tsg-dsp/http-data-plane-dtos";

export const cleanPolicyConfig = (
  policyConfig?: PolicyConfig
): PolicyConfig => {
  if (!policyConfig) {
    return {
      type: "default"
    };
  }
  switch (policyConfig.type) {
    case "default":
      return {
        type: "default"
      };
    case "rules":
      return {
        type: "rules",
        permissions: policyConfig.permissions,
        prohibitions: policyConfig.prohibitions
      };
    case "manual":
      return {
        type: "manual",
        raw: policyConfig.raw
      };
  }
};
