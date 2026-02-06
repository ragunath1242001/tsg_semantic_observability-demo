import { Resource } from "@tsg-dsp/common-dtos";
import { Column } from "typeorm";

import { MetaEntity } from "./meta.entity.js";

export abstract class OwnableEntity extends MetaEntity {
  abstract readonly resourceType: Resource;

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ nullable: true })
  ownerIdentifier?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  tenantId?: string;
}

export const OWNERSHIP_FIELDS = {
  ID: "id",
  OWNER_ID: "ownerId",
  OWNER_IDENTIFIER: "ownerIdentifier",
  CREATED_BY: "createdBy",
  TENANT_ID: "tenantId"
} as const;
