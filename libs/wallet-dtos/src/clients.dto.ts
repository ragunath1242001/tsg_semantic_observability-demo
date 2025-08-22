export enum AppRole {
  VIEW_DID = "wallet_view_did",
  MANAGE_KEYS = "wallet_manage_keys",
  USE_KEYS = "wallet_use_keys",
  VIEW_OWN_CREDENTIALS = "wallet_view_own_credentials",
  VIEW_ALL_CREDENTIALS = "wallet_view_all_credentials",
  MANAGE_OWN_CREDENTIALS = "wallet_manage_own_credentials",
  MANAGE_ALL_CREDENTIALS = "wallet_manage_all_credentials",
  ISSUE_CREDENTIALS = "wallet_issue_credentials",
  VIEW_PRESENTATIONS = "wallet_view_presentations",
  READONLY_USER = "readonly_user"
}

export interface ClientInfo {
  sub: string;
  name: string;
  email: string;
  didId: string;
  roles: AppRole[];
  refreshToken?: string;
}
