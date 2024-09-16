export const contexts = {
  odrl: "http://www.w3.org/ns/odrl/2/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  cred: "https://www.w3.org/2018/credentials#",
  sec: "https://w3id.org/security#",
  foaf: "http://xmlns.com/foaf/0.1/",
  cc: "http://creativecommons.org/ns#",
  dct: "http://purl.org/dc/terms/",
  dcat: "http://www.w3.org/ns/dcat#",
  dspace: "https://w3id.org/dspace/v0.8/",
};

export const toCompactUri = (uri: string) => {
  let compactUri = uri;
  for (const context of Object.entries(contexts)) {
    compactUri = compactUri.replace(context[1], `${context[0]}:`);
  }
  return compactUri;
};

export const toExpandedUri = (uri: string) => {
  let expandedUri = uri;
  for (const context of Object.entries(contexts)) {
    expandedUri = expandedUri.replace(`${context[0]}:`, context[1]);
  }
  return expandedUri;
};
