import { IsDateString, IsNotEmpty, ValidateIf, ValidateNested } from "class-validator";
import { Namespace, Serializable } from "../../decorators";
import {
  IReference,
  Reference,
  SerializableClass,
  Time,
  URI,
  Value,
} from "../common";
import { Action, LeftOperand, Operator } from "./negotiation.schema";

export interface IConstraint {
  leftOperand: LeftOperand;
  operator: Operator;
  rightOperand?: Value;
  rightOperandReference?: Reference;
}

@Serializable("odrl:Constraint")
export class Constraint extends SerializableClass {
  @Namespace("odrl")
  @IsNotEmpty()
  leftOperand: LeftOperand;
  @Namespace("odrl")
  @IsNotEmpty()
  operator: Operator;
  @Namespace("odrl")
  @IsNotEmpty()
  @ValidateNested()
  rightOperand?: Value;
  @Namespace("odrl")
  @ValidateIf((o: Constraint) => o.rightOperand === undefined)
  @ValidateNested()
  @IsNotEmpty()
  rightOperandReference?: Reference;

  constructor (value: IConstraint) {
    super();
    this.rightOperand = value.rightOperand;
    this.rightOperandReference = value.rightOperandReference;
    this.leftOperand = value.leftOperand;
    this.operator = value.operator;
  }
}

export interface IPolicyRule {
  assigner?: Reference;
  assignee?: Reference;
  action: Action;
  target?: string;
  constraint?: Array<Constraint>;
}

export interface IProhibition extends IPolicyRule {
  target: string;
}

export interface IDuty extends IPolicyRule {}

export interface IPermission extends IPolicyRule {
  target: string;
  duty?: Array<Duty>;
}

@Serializable("odrl:PolicyRule")
export class PolicyRule extends SerializableClass {
  @Namespace("odrl")
  @ValidateNested()
  assigner?: Reference;
  @Namespace("odrl")
  @ValidateNested()
  assignee?: Reference;
  @Namespace("odrl")
  @IsNotEmpty()
  action: Action;
  @Namespace("odrl")
  target?: string;
  @Namespace("odrl")
  @ValidateNested()
  constraint?: Array<Constraint>;

  constructor (value: IPolicyRule) {
    super();
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.action = value.action;
    this.target = value.target;
    this.constraint = value.constraint;
  }
}

@Serializable("odrl:Permission")
export class Permission extends PolicyRule {
  @Namespace("odrl")
  @IsNotEmpty()
  target: string;
  @Namespace("odrl")
  @ValidateNested()
  duty?: Array<Duty>;

  constructor (value: IPermission) {
    super(value);
    this.target = value.target;
    this.duty = value.duty;
  }
}

@Serializable("odrl:Prohibition")
export class Prohibition extends PolicyRule {
  @Namespace("odrl")
  @IsNotEmpty()
  target: string;

  constructor (value: IProhibition) {
    super(value);
    this.target = value.target;
  }
}

@Serializable("odrl:Duty")
export class Duty extends PolicyRule {}

export interface IPolicy extends IReference {
  assigner?: string;
  assignee?: string;
  profile?: Reference;
  permission?: Array<Permission>;
  prohibition?: Array<Prohibition>;
  obligation?: Array<Duty>;
}

@Serializable("odrl:Policy")
export class Policy extends Reference {
  @Namespace("odrl")
  // @ValidateNested()
  assigner?: string;
  @Namespace("odrl")
  // @ValidateNested()
  assignee?: string;
  @Namespace("odrl")
  @ValidateNested()
  profile?: Reference;
  @Namespace("odrl")
  @ValidateNested()
  permission?: Array<Permission>;
  @Namespace("odrl")
  @ValidateNested()
  prohibition?: Array<Prohibition>;
  @Namespace("odrl")
  @ValidateNested()
  obligation?: Array<Duty>;

  constructor (value: IPolicy) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.profile = value.profile;
    this.permission = value.permission;
    this.prohibition = value.prohibition;
    this.obligation = value.obligation;
  }
}

export interface IOffer extends IPolicy {
  assigner: string;
}

@Serializable("odrl:Offer")
export class Offer extends Policy {
  @Namespace("odrl")
  // @ValidateNested()
  @IsNotEmpty()
  assigner: string;

  constructor (value: IOffer) {
    super(value);
    this.assigner = value.assigner;
  }
}

export interface IAgreement extends IPolicy {
  assigner: string;
  assignee: string;
  timestamp: string;
  consumerId: string;
  providerId: string;
}

@Serializable("odrl:Agreement")
export class Agreement extends Policy {
  @Namespace("odrl")
  // @ValidateNested()
  @IsNotEmpty()
  assigner: string;
  @Namespace("odrl")
  // @ValidateNested()
  @IsNotEmpty()
  assignee: string;
  @Namespace("dspace")
  // @ValidateNested()
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  providerId: string;

  constructor (value: IAgreement) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.timestamp = value.timestamp;
    this.consumerId = value.consumerId;
    this.providerId = value.providerId;
  }
}
