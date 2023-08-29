
export enum AppRole {
  VIEW_DID = 'view_did',
  MANAGE_KEYS = 'manage_keys',
  VIEW_OWN_CREDENTIALS = 'view_own_credentials',
  VIEW_ALL_CREDENTIALS = 'view_all_credentials',
  MANAGE_OWN_CREDENTIALS = 'manage_own_credentials',
  MANAGE_ALL_CREDENTIALS = 'manage_all_credentials',
  ISSUE_CREDENTIALS = 'issue_credentials',
  VIEW_PRESENTATIONS = 'view_presentations',
  MANAGE_CLIENTS = 'manage_clients'
}

export interface ClientInfo {
  sub: string
  email: string
  didId: string
  roles: AppRole[]
  refreshToken?: string
}

export interface ClientSignup {
  clientId: string
  email: string
  secret: string
  didId: string
}

export interface ResetPassword {
  clientId: string
  old: string
  new: string
}