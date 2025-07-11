import {
  ReferenceObject,
  SchemaObject
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface.js";

import { ClaimDescription } from "../issuance.dto.js";

function isSchemaObject(
  schema: SchemaObject | ReferenceObject | undefined
): schema is SchemaObject {
  return !!schema && "$ref" in schema === false;
}
function isReferenceObject(
  schema: SchemaObject | ReferenceObject | undefined
): schema is ReferenceObject {
  return !!schema && "$ref" in schema === true;
}

function createClaimDescription(
  propertyName: string,
  propertySchema: SchemaObject,
  basePath: (string | null)[],
  requiredList?: string[]
): ClaimDescription {
  const claimDescription = new ClaimDescription();
  claimDescription.path = [...basePath, propertyName];
  if (Array.isArray(requiredList)) {
    claimDescription.mandatory = requiredList.includes(propertyName);
  }
  if (propertySchema.title) {
    claimDescription.display = [
      { name: propertySchema.title, locale: "en-US" }
    ];
  }
  return claimDescription;
}

export function convertJsonSchemaToClaimDescriptions(
  schema: SchemaObject,
  basePath: (string | null)[] = []
): ClaimDescription[] {
  const claimDescriptions: ClaimDescription[] = [];

  if (!schema.properties || typeof schema.properties !== "object") {
    return claimDescriptions;
  }

  for (const [propertyName, propertySchema] of Object.entries(
    schema.properties
  )) {
    if (isReferenceObject(propertySchema)) continue;

    const claimDescription = createClaimDescription(
      propertyName,
      propertySchema,
      basePath,
      schema.required
    );
    claimDescriptions.push(claimDescription);

    if (propertySchema.type === "object" && propertySchema.properties) {
      const nestedClaimDescriptions = convertJsonSchemaToClaimDescriptions(
        propertySchema,
        [...basePath, propertyName]
      );
      claimDescriptions.push(...nestedClaimDescriptions);
    }

    if (
      propertySchema.type === "array" &&
      isSchemaObject(propertySchema.items)
    ) {
      const nestedClaimDescriptions = convertJsonSchemaToClaimDescriptions(
        propertySchema.items,
        [...basePath, null]
      );
      claimDescriptions.push(...nestedClaimDescriptions);
    }
  }

  return claimDescriptions;
}
