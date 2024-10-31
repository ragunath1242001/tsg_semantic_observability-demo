import { MultilanguageDto } from "@tsg-dsp/common-dsp";

export const stripDspace = (inputStr: string): string => {
  return `${inputStr.replace("dspace:", "")}`;
};

export function obtainValues(
  multilingualArray: Array<MultilanguageDto | String>
) {
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

export function stringify(value: object): string {
  return JSON.stringify(value, null, 2);
}
