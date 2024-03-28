import crypto from "crypto";

export const jwtSecrets = {
  access: crypto.randomBytes(48).toString("hex"),
  refresh: crypto.randomBytes(48).toString("hex"),
};
