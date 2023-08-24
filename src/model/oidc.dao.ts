import { Column, Entity, ObjectLiteral, PrimaryColumn } from "typeorm";

type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

export abstract class OidcEntity implements ObjectLiteral {
  @PrimaryColumn()
  id!: string;

  @Column("simple-json")
  data!: any;

  @Column("date", {nullable: true})
  expiresAt?: Date

  @Column("date", {nullable: true})
  consumedAt?: Date
}

export abstract class GrantableEntity extends OidcEntity {
  @Column()
  grandId!: string
}

@Entity()
export class Session extends OidcEntity  {
  @Column()
  uid!: string
}

@Entity()
export class AccessToken extends GrantableEntity {}
@Entity()
export class AuthorizationCode extends GrantableEntity {}
@Entity()
export class RefreshToken extends GrantableEntity {}
@Entity()
export class DeviceCode extends GrantableEntity {
  @Column()
  userCode!: string
}
@Entity()
export class ClientCredentials extends OidcEntity {}
@Entity()
export class Client extends OidcEntity {}
@Entity()
export class InitialAccessToken extends OidcEntity {}
@Entity()
export class RegistrationAccessToken extends OidcEntity {}
@Entity()
export class Interaction extends OidcEntity {}
@Entity()
export class ReplayDetection extends OidcEntity {}
@Entity()
export class PushedAuthorizationRequest extends OidcEntity {}
@Entity()
export class Grant extends OidcEntity {}
@Entity()
export class BackchannelAuthenticationRequest extends GrantableEntity {}
