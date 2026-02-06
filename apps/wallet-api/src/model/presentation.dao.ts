import { DcqlQuery } from "@tsg-dsp/common-dtos";
import { Column, Entity } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class AuthorizationRequestDao extends MetaEntity {
  @Column({ type: "simple-json" })
  dcqlQuery!: DcqlQuery;
  @Column({ type: String })
  nonce!: string;
}
