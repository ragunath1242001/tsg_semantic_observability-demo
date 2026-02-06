import { UserDto } from "@tsg-dsp/sso-bridge-dtos";

import { OauthUser } from "../model/user.dao";

export const oauthUserToDto = (user: OauthUser): UserDto => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    require2FA: user.require2FA,
    permissions: user.permissions || [],
    grants: user.grants
  };
};
