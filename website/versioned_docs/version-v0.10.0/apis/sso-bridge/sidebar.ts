import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "apis/sso-bridge/tsg-sso-bridge",
    },
    {
      type: "category",
      label: "Health",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/health-controller-get-health",
          label: "Health check",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Auth",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/auth-controller-get-user",
          label: "Get user",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/auth-controller-login",
          label: "Login",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/auth-controller-logout",
          label: "Logout",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Users",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/users-controller-get-users",
          label: "Get all users",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/users-controller-create-user",
          label: "Create a new user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/users-controller-delete-user",
          label: "Delete a user",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/users-controller-update-user",
          label: "Update an existing user",
          className: "api-method patch",
        },
      ],
    },
    {
      type: "category",
      label: "Oauth",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-authorize",
          label: "Authorize",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-login",
          label: "Login",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-token",
          label: "Token",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-userinfo-get",
          label: "Get Userinfo",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-userinfo-post",
          label: "Get Userinfo",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-introspect",
          label: "Introspect",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-device-authorization",
          label: "Device Authorization",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-revocation",
          label: "Revocation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oauth-controller-get-jwks",
          label: "Get JWKS",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Clients",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/clients-controller-get-clients",
          label: "Retrieve all clients",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/clients-controller-create-user",
          label: "Create a new client",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/clients-controller-delete-client",
          label: "Delete a client by id",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/clients-controller-update-client",
          label: "Update an existing client",
          className: "api-method patch",
        },
      ],
    },
    {
      type: "category",
      label: "Well-known endpoint",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/metadata-controller-get-open-id-configuration",
          label: "Open ID Configuration",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "OID4VP",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/oid-4-vp-verifier-controller-get-authorization-request",
          label: "Get the Authorization Request",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oid-4-vp-verifier-controller-status",
          label: "Get the Authorization Request Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oid-4-vp-verifier-controller-redirect",
          label: "Redirect to the Authorization Request",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oid-4-vp-verifier-controller-authorize",
          label: "Add an Authorization Request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/oid-4-vp-verifier-management-controller-status",
          label: "Obtain an Authorization Request",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Schemas",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/jsonwebkeydto",
          label: "JsonWebKeyDto",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/jwks",
          label: "JWKS",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/openidconfiguration",
          label: "OpenIDConfiguration",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/clientdto",
          label: "ClientDto",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/errordto",
          label: "ErrorDto",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/descriptormap",
          label: "DescriptorMap",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/presentationsubmission",
          label: "PresentationSubmission",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/authorizationresponse",
          label: "AuthorizationResponse",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
