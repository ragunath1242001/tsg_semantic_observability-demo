export const pushOrCreate = (
  containing: Record<string, any>,
  property: string,
  element: any
) => {
  if (containing[property]) {
    containing[property].push(element);
  } else {
    containing[property] = [element];
  }
};
