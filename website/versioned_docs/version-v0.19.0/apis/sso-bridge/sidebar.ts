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
        {
          type: "doc",
          id: "apis/sso-bridge/auth-controller-verify-2-fa",
          label: "Verify 2FA Token",
          className: "api-method post",
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
        {
          type: "doc",
          id: "apis/sso-bridge/users-controller-reset-user-2-fa",
          label: "Reset 2FA for a user",
          className: "api-method post",
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
      label: "Audit Logs",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/audit-log-controller-list",
          label: "List audit log entries",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/audit-log-controller-get-by-id",
          label: "Get audit log entry by ID",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "TOTP",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-get-2-faqr-code",
          label: "Get TOTP Setup QR Code",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-get-2-fa-secret",
          label: "Get TOTP Setup Secret",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-verify-2-fa-setup",
          label: "Verify TOTP Setup",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-initiate-totp-registration",
          label: "Initiate TOTP Registration",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-complete-totp-registration",
          label: "Complete TOTP Registration",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-list-totp-credentials",
          label: "List TOTP Credentials",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-delete-totp-credential",
          label: "Delete TOTP Credential",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-enable-2-fa",
          label: "Enable 2FA for current user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-disable-2-fa",
          label: "Disable 2FA for current user",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-reset-2-fa",
          label: "Reset 2FA for current user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-get-2-faqr-code-for-profile",
          label: "Get 2FA QR Code for Profile",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-get-2-fa-secret-for-profile",
          label: "Get 2FA Secret for Profile",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/totp-controller-verify-2-fa-setup-for-profile",
          label: "Verify 2FA Setup for Profile",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "WebAuthn",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/web-authn-controller-initiate-web-authn-registration",
          label: "Initiate WebAuthn Registration",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/web-authn-controller-complete-web-authn-registration",
          label: "Complete WebAuthn Registration",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/web-authn-controller-initiate-web-authn-authentication",
          label: "Initiate WebAuthn Authentication",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/web-authn-controller-complete-web-authn-authentication",
          label: "Complete WebAuthn Authentication",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/web-authn-controller-list-web-authn-credentials",
          label: "List WebAuthn Credentials",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/web-authn-controller-delete-web-authn-credential",
          label: "Delete WebAuthn Credential",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Recovery Codes",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/recovery-code-controller-regenerate-recovery-codes",
          label: "Regenerate Recovery Codes",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/recovery-code-controller-get-recovery-codes-status",
          label: "Get Recovery Codes Status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/recovery-code-controller-acknowledge-recovery-codes",
          label: "Acknowledge Recovery Codes",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Profile",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/profile-controller-get-profile",
          label: "Get current user profile",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/profile-controller-change-password",
          label: "Change current user password",
          className: "api-method patch",
        },
      ],
    },
    {
      type: "category",
      label: "Permissions",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/permissions-controller-get-permissions",
          label: "Get all available permissions",
          className: "api-method get",
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
      label: "IngressAuth",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "apis/sso-bridge/ingress-auth-controller-auth-url",
          label: "IngressAuthController_authUrl",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/ingress-auth-controller-auth-signin",
          label: "IngressAuthController_authSignin",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/ingress-auth-controller-auth-logout",
          label: "IngressAuthController_authLogout",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/ingress-auth-controller-auth-callback",
          label: "IngressAuthController_authCallback",
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
          id: "apis/sso-bridge/schemas/vptoken",
          label: "VpToken",
          className: "schema",
        },
        {
          type: "doc",
          id: "apis/sso-bridge/schemas/oid-4-vpauthorizationresponse",
          label: "OID4VPAuthorizationResponse",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
