import { copyFileSync, existsSync } from "fs";

const dest = "../../website/docs/";

if (existsSync(dest)) {
  for (const f of ["tsg", "health"]) {
    copyFileSync(`src/jsonld/contexts/${f}.json`, `${dest}${f}.json`);
  }
}
