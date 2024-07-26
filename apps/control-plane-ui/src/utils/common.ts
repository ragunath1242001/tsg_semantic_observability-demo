import { MultilanguageDto } from "@tsg-dsp/common-dsp";

const stripDspace = (inputStr: string): string => {
  return `${inputStr.replace("dspace:", "")}`;
};
function obtainValues(multilingualArray: Array<MultilanguageDto | String>) {
  if (multilingualArray !== undefined && Array.isArray(multilingualArray)) {
    return multilingualArray.map((element) =>
      typeof element == "object"
        ? (element as MultilanguageDto)["@value"]
        : typeof element === "string"
        ? element
        : (() => {
            console.error(
              `Could not obtain value from ${multilingualArray}, unknown type`
            );
            return "";
          })()
    );
  } else {
    return [];
  }
}
function stringify(value: object): string {
  return JSON.stringify(value, null, 2);
}

export default {
  stripDspace,
  obtainValues,
  stringify,
};
