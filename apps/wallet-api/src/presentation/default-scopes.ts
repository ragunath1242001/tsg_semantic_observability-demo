import { AddScope } from "@tsg-dsp/wallet-dtos";

export const DEFAULT_SCOPES: AddScope[] = [
  {
    alias: "org.eclipse.dspace.dcp.vc.type",
    discriminator: "{type}",
    description: "Credential type based scope",
    presentationDefinition: {
      id: "org.eclipse.dspace.dcp.vc.type",
      input_descriptors: [
        {
          id: "type_based_credential",
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "{type}"
                }
              }
            ]
          }
        }
      ]
    }
  },
  {
    alias: "org.eclipse.dspace.dcp.vc.id",
    discriminator: "{id}",
    description: "Credential ID based scope",
    presentationDefinition: {
      id: "org.eclipse.dspace.dcp.vc.id",
      input_descriptors: [
        {
          id: "id_based_credential",
          constraints: {
            fields: [
              {
                path: ["$.id"],
                filter: {
                  type: "string",
                  pattern: "{id}"
                }
              }
            ]
          }
        }
      ]
    }
  },
  {
    alias: "nl.tsg.adp.project",
    discriminator: "{initiatorDid}:{agreementHash}",
    description: "Analytics Data Plane scope for Project Agreements",
    presentationDefinition: {
      id: "nl.tsg.adp.project",
      input_descriptors: [
        {
          id: "agreement_credential",
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "ProjectAgreementCredential"
                }
              },
              {
                path: ["$.issuer"],
                filter: {
                  type: "string",
                  pattern: "{initiatorDid}"
                }
              },
              {
                path: ["$.credentialSubject.hash"],
                filter: {
                  type: "string",
                  pattern: "{agreementHash}"
                }
              }
            ]
          }
        }
      ]
    }
  }
];
