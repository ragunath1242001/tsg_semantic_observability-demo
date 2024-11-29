import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "apis/control-plane/tsg-control-plane",
    },
    {
      type: "category",
      label: "Health",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/health-controller-get-health",
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
          id: "apis/control-plane/config-controller-get-settings",
          label: "Retrieve settings",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/config-controller-update-settings",
          label: "Update settings",
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
          id: "apis/control-plane/auth-controller-get-user",
          label: "Retrieve current user status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/auth-controller-login",
          label: "Login redirect",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/auth-controller-logout",
          label: "Logout redirect",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/auth-controller-callback",
          label: "Login callback",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Data Plane",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/data-plane-controller-init",
          label: "Initialize data plane",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/data-plane-controller-update",
          label: "Update data plane",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/data-plane-controller-update-catalog",
          label: "Update catalog",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Data Plane Management",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/dataplane-management-controller-get-data-planes",
          label: "Get all dataplanes",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/dataplane-management-controller-add-dataplane",
          label: "Add a dataplane",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/dataplane-management-controller-update-dataplane",
          label: "Update a dataplane",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/control-plane/dataplane-management-controller-delete-data-plane",
          label: "Delete a dataplane",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Catalog",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/catalog-controller-request",
          label: "Request catalog",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/catalog-controller-get-dataset",
          label: "Get dataset",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Catalog Management",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/catalog-management-controller-request-catalog",
          label: "Request catalog",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/catalog-management-controller-request-dataset",
          label: "Request dataset",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/catalog-management-controller-add-dataset",
          label: "Add dataset",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/catalog-management-controller-update-dataset",
          label: "Update dataset",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/control-plane/catalog-management-controller-delete-dataset",
          label: "Delete dataset",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Negotiations",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-request",
          label: "Request a new negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-get-negotiation",
          label: "Get negotiation status by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-request-with-id",
          label: "Request negotiation with ID",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-negotiation-event",
          label: "Handle negotiation event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-agreement-verification",
          label: "Verify agreement",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-negotiation-termination",
          label: "Terminate negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-callback-offer",
          label: "Handle negotiation callback offer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-callback-agreement",
          label: "Handle negotiation callback agreement",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-controller-callback-event",
          label: "Handle negotiation callback event",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Negotiations Management",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-get-negotiations",
          label: "Get all negotiations",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-get-negotiations-from-dataset-id",
          label: "Get all negotiations for a dataset",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-get-negotiation",
          label: "Get a negotiation by process ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-request-new-negotiation",
          label: "Request a new negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-request-existing-negotiation",
          label: "Request an existing negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-offer",
          label: "Submit an offer for an existing negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-agree",
          label: "Agree to a negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-verify",
          label: "Verify a negotiation agreement",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-finalize",
          label: "Finalize a negotiation",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/negotiation-management-controller-terminate",
          label: "Terminate a negotiation",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Transfers",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-request",
          label: "Request a transfer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-get-transfer",
          label: "Get transfer status by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-start-transfer-process",
          label: "Start transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-complete-transfer-process",
          label: "Complete transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-terminate-transfer-process",
          label: "Terminate transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-suspend-transfer-process",
          label: "Suspend transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-callback-start-transfer-process",
          label: "Callback to start transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-callback-complete-transfer-process",
          label: "Callback to complete transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-callback-terminate-transfer-process",
          label: "Callback to terminate transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-controller-callback-suspend-transfer-process",
          label: "Callback to suspend transfer process",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Transfers Management",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-get-transfers",
          label: "Get all transfers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-get-transfer",
          label: "Get transfer details by process ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-request-transfer",
          label: "Request a new transfer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-start-transfer",
          label: "Start a transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-complete-transfer",
          label: "Complete a transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-terminate-transfer",
          label: "Terminate a transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/transfer-management-controller-suspend-transfer",
          label: "Suspend a transfer process",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Registry",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/registry-controller-get-catalogs",
          label: "Get all catalogs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/registry-controller-request-addresses",
          label: "Request all addresses",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Registry Management",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/registry-client-controller-request-catalogs",
          label: "Request catalogs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/registry-client-controller-request-addresses",
          label: "Request addresses",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/registry-client-controller-request-did-documents",
          label: "Request DID Documents",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/registry-client-controller-get-catalogs",
          label: "Get catalogs",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Status",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/status-controller-get-status",
          label: "Appplication status",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Agreement",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/agreement-management-controller-get-agreement",
          label: "Get an agreement by agreement ID",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Evaluation",
      items: [
        {
          type: "doc",
          id: "apis/control-plane/policy-evaluation-controller-get-last-context",
          label: "Retrieve last evaluation context",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/policy-evaluation-controller-get-last-decision",
          label: "Retrieve last evaluation decision",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/policy-evaluation-controller-evaluate",
          label: "Retrieve last evaluation context",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/policy-evaluation-controller-evaluate-data-plane",
          label: "Retrieve last evaluation context",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-constraints",
          label: "Retrieve constraints",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-add-constraint",
          label: "Add constraint",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-constraint-by-odrl",
          label: "Get constraint by ODRL",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-constraint",
          label: "Get constraint",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-delete-constraint",
          label: "Delete constraint",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-update-constraint",
          label: "Update constraint",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-constraint-odrl",
          label: "Get constraint ODRL",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-rules",
          label: "Retrieve rules",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-add-rule",
          label: "Add rule",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-rule",
          label: "Get rule",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-delete-rule",
          label: "Delete rule",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-update-rule",
          label: "Update rule",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/control-plane/rule-repository-controller-get-rule-odrl",
          label: "Get rule ODRL",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
