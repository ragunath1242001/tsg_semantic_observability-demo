import { computed, type WritableComputedRef } from "vue";

export function usePopulationCoverage(
  coverageValue: WritableComputedRef<string>
): {
  basic: WritableComputedRef<string>;
  extended: WritableComputedRef<string>;
} {
  const basic = computed({
    get: () => {
      const coverage = coverageValue.value;
      if (typeof coverage === "string" && coverage.includes("|")) {
        return coverage.split("|")[0] || "";
      }
      return coverage || "";
    },
    set: (value: string) => {
      const trimmedValue = value?.trim() || "";
      const extendedValue = extended.value;

      if (trimmedValue && extendedValue) {
        coverageValue.value = `${trimmedValue}|${extendedValue}`;
      } else if (trimmedValue) {
        coverageValue.value = trimmedValue;
      } else if (extendedValue) {
        coverageValue.value = extendedValue;
      } else {
        coverageValue.value = "";
      }
    }
  });

  const extended = computed({
    get: () => {
      const coverage = coverageValue.value;
      if (typeof coverage === "string" && coverage.includes("|")) {
        return coverage.split("|")[1] || "";
      }
      return "";
    },
    set: (value: string) => {
      const trimmedValue = value?.trim() || "";
      const basicValue = basic.value;

      if (basicValue && trimmedValue) {
        coverageValue.value = `${basicValue}|${trimmedValue}`;
      } else if (basicValue) {
        coverageValue.value = basicValue;
      } else if (trimmedValue) {
        coverageValue.value = trimmedValue;
      } else {
        coverageValue.value = "";
      }
    }
  });

  return {
    basic,
    extended
  };
}
