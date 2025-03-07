import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import {
  ConstraintType,
  DataType,
  EvaluationTrigger
} from "../policy/constraint.dto.js";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class ConstraintDao extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "simple-enum", enum: ConstraintType })
  type!: ConstraintType;

  @Column({ type: String })
  title!: string;

  @Column({ type: String, nullable: true })
  description?: string;

  @Column({ type: String, nullable: true })
  logicalOperator?: "and" | "or";

  @ManyToMany(() => ConstraintDao, {
    nullable: true,
    cascade: true
  })
  @JoinTable()
  constraints?: ConstraintDao[];

  @Column({ type: String, nullable: true, unique: true })
  leftOperand?: string;

  @Column({ type: String, nullable: true })
  operator?: string;

  @Column({ type: String, nullable: true })
  contextPath?: string;

  @Column("simple-array", { nullable: true })
  evaluable?: EvaluationTrigger[];

  @Column({ type: "simple-enum", enum: DataType, nullable: true })
  dataType?: DataType;
}

@Entity()
export class RuleDao extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("simple-array")
  action!: string[];

  @Column("simple-array", { nullable: true })
  assignee!: string[];

  @ManyToMany(() => ConstraintDao, { cascade: true })
  @JoinTable()
  constraints!: ConstraintDao[];

  @ManyToMany(() => RuleDao, { cascade: true })
  @JoinTable()
  duties!: RuleDao[];
}
