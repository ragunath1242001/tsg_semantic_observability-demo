import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "apis/http-data-plane/tsg-http-data-plane",
    },
    {
      type: "category",
      label: "Authentication",
      items: [
        {
          type: "doc",
          id: "apis/http-data-plane/auth-controller-get-user",
          label: "Retrieve current user status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/auth-controller-login",
          label: "Login redirect",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/auth-controller-logout",
          label: "Logout redirect",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/auth-controller-callback",
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
          id: "apis/http-data-plane/data-plane-controller-get-catalog",
          label: "Get catalog",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-controller-health-check",
          label: "Health check",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-controller-request-transfer",
          label: "Request Transfer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-controller-start-transfer",
          label: "Start transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-controller-complete-transfer",
          label: "Complete transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-controller-terminate-transfer",
          label: "Terminate transfer process",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-controller-suspend-transfer",
          label: "Suspend transfer process",
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
          id: "apis/http-data-plane/data-plane-management-controller-get-state",
          label: "Get Data Plane state",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-get-catalog",
          label: "Get catalog",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-refresh-registration",
          label: "(Re)register data plane",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-get-dataset-config",
          label: "Get dataset",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-update-dataset-config",
          label: "Update dataset",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-get-transfers",
          label: "Get all transfers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-get-transfer",
          label: "Get transfer by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-get-metadata",
          label: "Get metadata of transfer by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-start-transfer",
          label: "Start a transfer by ID",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-complete-transfer",
          label: "Complete a transfer by ID",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-terminate-transfer",
          label: "Terminate a transfer by ID",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-suspend-transfer",
          label: "Suspend a transfer by ID",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-get",
          label: "Proxy a request",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-post",
          label: "Proxy a request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-put",
          label: "Proxy a request",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-delete",
          label: "Proxy a request",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-patch",
          label: "Proxy a request",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-options",
          label: "Proxy a request",
          className: "api-method options",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-head",
          label: "Proxy a request",
          className: "api-method head",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-search",
          label: "Proxy a request",
          className: "api-method search",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-get",
          label: "Proxy a request without transfer ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-post",
          label: "Proxy a request without transfer ID",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-put",
          label: "Proxy a request without transfer ID",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-delete",
          label: "Proxy a request without transfer ID",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-patch",
          label: "Proxy a request without transfer ID",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-options",
          label: "Proxy a request without transfer ID",
          className: "api-method options",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-head",
          label: "Proxy a request without transfer ID",
          className: "api-method head",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/data-plane-management-controller-execute-transfer-without-id-search",
          label: "Proxy a request without transfer ID",
          className: "api-method search",
        },
      ],
    },
    {
      type: "category",
      label: "Proxy",
      items: [
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-get",
          label: "Proxy a request",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-post",
          label: "Proxy a request",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-put",
          label: "Proxy a request",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-delete",
          label: "Proxy a request",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-patch",
          label: "Proxy a request",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-options",
          label: "Proxy a request",
          className: "api-method options",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-head",
          label: "Proxy a request",
          className: "api-method head",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/proxy-controller-get-data-search",
          label: "Proxy a request",
          className: "api-method search",
        },
      ],
    },
    {
      type: "category",
      label: "Logging",
      items: [
        {
          type: "doc",
          id: "apis/http-data-plane/logging-controller-get-ingress-logs",
          label: "Get ingress logs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "apis/http-data-plane/logging-controller-get-egress-logs",
          label: "Get egress logs",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
