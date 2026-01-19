import { UserDto } from "@tsg-dsp/sso-bridge-dtos";

import { OauthUser } from "../model/user.dao";

export const oauthUserToDto = (user: OauthUser): UserDto => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    require2FA: user.require2FA,
    roles: user.roles.map((role) => role.name),
    grants: user.grants
  };
};
