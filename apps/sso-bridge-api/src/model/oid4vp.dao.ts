import { AuthorizationRequest } from "@tsg-dsp/common-api";
import { DcqlQuery } from "@tsg-dsp/common-dtos";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";
import { OauthUser } from "./user.dao.js";

@Entity()
export class AuthorizationRequestDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column({ type: "simple-json" })
  dcqlQuery!: DcqlQuery;

  @Column({ type: String })
  nonce!: string;

  @Column({ type: "simple-json", nullable: true })
  authorizationRequest?: AuthorizationRequest;

  @ManyToOne(() => OauthUser)
  user?: OauthUser;

  @Column({ type: Boolean, default: false })
  completed!: boolean;

  @Column({ type: String, nullable: true })
  response_mode?: string;

  @Column({ type: String, nullable: true })
  response_type?: string;

  @Column({ type: String, nullable: true })
  response_uri?: string;

  @Column({ type: String, nullable: true })
  request?: string; // JWT request object

  @Column({ type: String, nullable: true })
  request_uri?: string;

  @Column({ type: "simple-json", nullable: true })
  client_metadata?: Record<string, unknown>;
}
