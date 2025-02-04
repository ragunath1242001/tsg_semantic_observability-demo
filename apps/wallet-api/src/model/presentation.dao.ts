import { Column, Entity, PrimaryColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";
import { PresentationDefinition } from "@tsg-dsp/common-dtos";

@Entity()
export class AuthorizationRequestDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  identifier!: string;
  @Column({ type: "simple-json" })
  presentationDefinition!: PresentationDefinition;
  @Column({ type: String })
  nonce!: string;
}
