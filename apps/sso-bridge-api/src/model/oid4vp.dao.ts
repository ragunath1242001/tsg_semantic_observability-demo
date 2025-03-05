import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";
import { AuthorizationRequest } from "@tsg-dsp/common-api";
import { PresentationDefinition } from "@tsg-dsp/common-dtos";
import { OauthUser } from "./user.dao.js";

@Entity()
export class AuthorizationRequestDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  identifier!: string;
  @Column({ type: "simple-json" })
  presentationDefinition!: PresentationDefinition;
  @Column({ type: String })
  nonce!: string;
  @Column({ type: "simple-json", nullable: true })
  authorizationRequest?: AuthorizationRequest;
  @ManyToOne(() => OauthUser)
  user?: OauthUser;
  @Column({ type: Boolean, default: false })
  completed!: boolean;
}
