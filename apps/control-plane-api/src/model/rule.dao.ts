import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MetaEntity } from "./common.dao";
import {
  ConstraintType,
  EvaluationTrigger,
  DataType,
} from "../policy/constraint.dto";

@Entity()
export class ConstraintDao {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: ConstraintType;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  logicalOperator?: "and" | "or";

  @ManyToMany(() => ConstraintDao, {
    nullable: true,
    cascade: true,
  })
  @JoinTable()
  constraints?: ConstraintDao[];

  @Column({ nullable: true, unique: true })
  leftOperand?: string;

  @Column({ nullable: true })
  operator?: string;

  @Column({ nullable: true })
  contextPath?: string;

  @Column("simple-array", { nullable: true })
  evaluable?: EvaluationTrigger[];

  @Column({ nullable: true })
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
