export const filteredKeys = (obj: any, keys?: string | string[]) => {
  const keyNames = Object.getOwnPropertyNames(obj);
  if (!keys) {
    return keyNames;
  }
  if (Array.isArray(keys)) {
    return keyNames.filter((key) => !keys.includes(key));
  }
  return keyNames.filter((key) => key != keys);
};
