export enum AppRole {
  VIEW_DID = 'view_did',
  MANAGE_KEYS = 'manage_keys',
  VIEW_OWN_CREDENTIALS = 'view_own_credentials',
  VIEW_ALL_CREDENTIALS = 'view_all_credentials',
  MANAGE_OWN_CREDENTIALS = 'manage_own_credentials',
  MANAGE_ALL_CREDENTIALS = 'manage_all_credentials',
  VIEW_PRESENTATIONS = 'view_presentations',
  MANAGE_CLIENTS = 'manage_clients'
}

export interface ClientInfo {
  sub: string
  email: string
  didId: string
  roles: AppRole[]
}

export interface ClientSignup {
  email: string
  secret: string
  didId: string
}

export interface Clients {
  id: number
  clientId: string
  clientSecret: string
  didId: string
  roles: AppRole[]
  refreshToken?: string
  email: string
  verified: boolean
  verificationCode?: string
  verificationExpiration?: Date
}
