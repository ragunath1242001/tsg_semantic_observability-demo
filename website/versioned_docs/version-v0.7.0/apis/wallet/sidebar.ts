import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "apis/wallet/tsg-wallet",
    },
    {
      type: "category",
      label: "Health",
      items: [
        {
          type: "doc",
          id: "apis/wallet/health-controller-get-health",
          label: "Health check",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Settings",
      items: [
        {
          type: "doc",
          id: "apis/wallet/config-controller-get-settings",
          label: "Retrieve settings",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/config-controller-update-settings",
          label: "Update settings",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/config-controller-upload-file",
          label: "Upload logo",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Authentication",
      items: [
        {
          type: "doc",
          id: "apis/wallet/auth-controller-get-user",
          label: "Retrieve current user status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/auth-controller-login",
          label: "Login redirect",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/auth-controller-logout",
          label: "Logout redirect",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/auth-controller-callback",
          label: "Login callback",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Contexts",
      items: [
        {
          type: "doc",
          id: "apis/wallet/context-controller-get-context",
          label: "Retrieve context",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Keys",
      items: [
        {
          type: "doc",
          id: "apis/wallet/keys-controller-get-ca-chain",
          label: "Retrieve Key CA chain",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Credentials",
      items: [
        {
          type: "doc",
          id: "apis/wallet/credentials-controller-get-credentials",
          label: "List dataspace credentials",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-controller-get-credential",
          label: "Retrieve credential",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Management DID",
      items: [
        {
          type: "doc",
          id: "apis/wallet/did-management-controller-get-did-document",
          label: "Retrieve DID document",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/did-management-controller-resolve-did-document",
          label: "Resolve DID document",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/did-management-controller-get-services",
          label: "Retrieve DID services",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/did-management-controller-add-service",
          label: "Add DID service",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/did-management-controller-update-service",
          label: "Update DID service",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/wallet/did-management-controller-delete-service",
          label: "Delete DID service",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Management Contexts",
      items: [
        {
          type: "doc",
          id: "apis/wallet/context-management-controller-get-contexts",
          label: "Retrieve contexts",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/context-management-controller-add-context",
          label: "Add context",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/context-management-controller-update-context",
          label: "Update context",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/wallet/context-management-controller-delete-context",
          label: "Delete context",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Management Keys",
      items: [
        {
          type: "doc",
          id: "apis/wallet/keys-management-controller-get-keys",
          label: "Retrieve keys",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/keys-management-controller-add-key",
          label: "Add key",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/keys-management-controller-get-key",
          label: "Retrieve key",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/keys-management-controller-delete-key",
          label: "Delete key",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/wallet/keys-management-controller-set-default-key",
          label: "Set default key",
          className: "api-method put",
        },
      ],
    },
    {
      type: "category",
      label: "Management Credentials",
      items: [
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-get-credentials",
          label: "List credentials",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-add-credential",
          label: "Add credential",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-get-dataspace-credentials",
          label: "List dataspace credentials",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-get-config",
          label: "Retrieve credential configuration",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-import-credential",
          label: "Import credential",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-get-credential",
          label: "Retrieve credential",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-update-credential",
          label: "Update credential",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-delete-credential",
          label: "Delete credential",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/wallet/credentials-management-controller-revoke-credential",
          label: "Revoke credential",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Management Gaia-X Credentials",
      items: [
        {
          type: "doc",
          id: "apis/wallet/gaia-x-management-controller-request-legal-registration-number-credential",
          label: "Issue legal registration number credential",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/gaia-x-management-controller-request-compliance-credential",
          label: "Request compliance credential",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Management Presentation",
      items: [
        {
          type: "doc",
          id: "apis/wallet/presentation-management-controller-status",
          label: "Get the status of a credential",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "OpenID 4 Verifiable Credential Issuance",
      items: [
        {
          type: "doc",
          id: "apis/wallet/holder-controller-request-credential",
          label: "Request credential via OID4VCI",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/issuer-controller-issuer-metadata",
          label: "IssuerController_issuerMetadata",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/issuer-controller-token-endpoint",
          label: "Request OID4VCI access token",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/issuer-controller-credential-endpoint",
          label: "Request OID4VCI credential",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/issuer-controller-list-offers",
          label: "Retrieve offered credentials",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/issuer-controller-offer-endpoint",
          label: "Add offer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/issuer-controller-revoke-offer",
          label: "Revoke offer",
          className: "api-method put",
        },
      ],
    },
    {
      type: "category",
      label: "Presentation DCP",
      items: [
        {
          type: "doc",
          id: "apis/wallet/dcp-holder-controller-presentation-query",
          label: "Retrieve presentation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/dcp-holder-management-controller-create-si-token",
          label: "Request a SIOP token",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/dcp-verifier-management-controller-verify",
          label: "Start verification flow",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Presentation Direct",
      items: [
        {
          type: "doc",
          id: "apis/wallet/direct-presentation-controller-create-presentation",
          label: "Request a presentation",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/direct-presentation-controller-validate-presentation",
          label: "Validate presentation",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Status",
      items: [
        {
          type: "doc",
          id: "apis/wallet/status-controller-get-status",
          label: "Application status",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "OID4VP",
      items: [
        {
          type: "doc",
          id: "apis/wallet/oid-4-vp-verifier-controller-get-authorization-request",
          label: "Get the Authorization Request",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/wallet/oid-4-vp-verifier-controller-status",
          label: "Add an Authorization Request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/oid-4-vp-verifier-management-controller-status",
          label: "Add an Authorization Request",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Management Signatures",
      items: [
        {
          type: "doc",
          id: "apis/wallet/signature-management-controller-sign",
          label: "Sign document",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/wallet/signature-management-controller-validate",
          label: "Validate signed document",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "DID Web",
      items: [
        {
          type: "doc",
          id: "apis/wallet/did-web-controller-get-did",
          label: "Retrieve DID document",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
