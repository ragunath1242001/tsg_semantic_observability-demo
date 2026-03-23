import { AuditSeverity } from "@tsg-dsp/common-dtos";
import { Column, CreateDateColumn, Entity, Index } from "typeorm";

import { MetaEntity } from "../model/meta.entity.js";

@Entity("audit_log")
@Index(["timestamp"])
@Index(["severity"])
@Index(["callerSub"])
@Index(["action"])
@Index(["resourceType"])
@Index(["resultAllowed"])
export class AuditLogDao extends MetaEntity {
  @CreateDateColumn()
  timestamp!: Date;

  @Column({ type: String })
  severity!: AuditSeverity;

  @Column({ type: String, nullable: true })
  correlationId?: string;

  @Column({ type: String })
  callerSub!: string;

  @Column({ type: String })
  callerType!: string;

  @Column({ type: String, nullable: true })
  callerServiceName?: string;

  @Column({ type: String, nullable: true })
  callerUsername?: string;

  @Column({ type: String, nullable: true })
  callerDidId?: string;

  @Column({ type: String, nullable: true })
  onBehalfOfSub?: string;

  @Column({ type: String, nullable: true })
  onBehalfOfUsername?: string;

  @Column({ type: String, nullable: true })
  onBehalfOfDidId?: string;

  @Column("simple-json", { nullable: true })
  delegationChain?: string[];

  @Column({ type: String })
  action!: string;

  @Column({ type: String })
  resourceType!: string;

  @Column({ type: String, nullable: true })
  resourceId?: string;

  @Column({ type: String, nullable: true })
  ipAddress?: string;

  @Column({ type: String, nullable: true })
  userAgent?: string;

  @Column({ type: String, nullable: true })
  requestPath?: string;

  @Column({ type: String, nullable: true })
  requestMethod?: string;

  @Column({ type: "boolean" })
  resultAllowed!: boolean;

  @Column({ type: String, nullable: true })
  resultReason?: string;

  @Column({ type: String, nullable: true })
  resultMatchedPermission?: string;

  @Column({ type: String, nullable: true })
  resultEffectiveScope?: string;
}
