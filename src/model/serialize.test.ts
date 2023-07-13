import { serializableTypes } from "./decorators";
import { ContractNegotiationTerminationMessage } from "./dsp/negotiation/messages";
import { Constraint, PolicyRule } from "./dsp/negotiation/negotiation";
import { deserialize } from "./serialize";


test("Test deserialization validation", async () => {
  const test = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiationTerminationMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:reason": [
      {
        "@value": "Could not proceed with negotiation",
        "@language": "en"
      }
    ]
  };
  const deserialized = await deserialize<ContractNegotiationTerminationMessage>(test)
  serializableTypes["test"] = PolicyRule
  const type = serializableTypes["test"]

  const keys = Reflect.getMetadataKeys(type.prototype).map(key => {
    return {
      key,
      metdata: Reflect.getMetadata(key, type.prototype)
    }
  });
  const properties = Object.getOwnPropertyNames(new type.prototype.constructor({}, false)).map(property => {
    return {
      property,
      metadata: Reflect.getMetadataKeys(type.prototype, property).map(key => {
        return {
          key,
          metdata: Reflect.getMetadata(key, type.prototype, property)
        }
      })
    }
  })
  console.log("")
})