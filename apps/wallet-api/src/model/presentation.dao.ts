import { DcqlQuery } from "@tsg-dsp/common-dtos";
import { Column, Entity, PrimaryColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class AuthorizationRequestDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  identifier!: string;
  @Column({ type: "simple-json" })
  dcqlQuery!: DcqlQuery;
  @Column({ type: String })
  nonce!: string;
}
