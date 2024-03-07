import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Namespace, Serializable } from "../../decorators";
import {
  IReference,
  Multilanguage,
  Reference,
  SerializableClass,
  Value,
} from "../common";
import { ContractAgreementVerificationMessage } from "./messages";
import {
  ODRLLeftOperand,
  ODRLOperator,
  ConstraintDto,
  ContextDto,
  ODRLAction,
  PermissionDto,
  ProhibitionDto,
  DutyDto,
  PolicyDto,
  OfferDto,
  AgreementDto,
  ContractNegotiationState,
} from "@tsg-dsp/common";

export interface IConstraint {
  leftOperand: ODRLLeftOperand | string;
  operator: ODRLOperator | string;
  rightOperand?: Value | string;
  rightOperandReference?: string;
}

@Serializable("odrl:Constraint")
export class Constraint extends SerializableClass<ConstraintDto & ContextDto> {
  @Namespace("odrl")
  @IsNotEmpty()
  leftOperand: ODRLLeftOperand | string;
  @Namespace("odrl")
  @IsNotEmpty()
  operator: ODRLOperator | string;
  @Namespace("odrl")
  @IsNotEmpty()
  @ValidateNested()
  rightOperand?: Value | string;
  @Namespace("odrl")
  @ValidateIf((o: Constraint) => o.rightOperand === undefined)
  @ValidateNested()
  @IsNotEmpty()
  rightOperandReference?: string;

  constructor(value: IConstraint) {
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
  action: ODRLAction | string;
  target?: string;
  constraint?: Array<Constraint>;
}

export interface IProhibition extends IPolicyRule {
  target: string;
}

export type IDuty = IPolicyRule;

export interface IPermission extends IPolicyRule {
  target: string;
  duty?: Array<Duty>;
}

@Serializable("odrl:PolicyRule")
export class PolicyRule<
  OutType extends ContextDto
> extends SerializableClass<OutType> {
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  assigner?: Reference;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  assignee?: Reference;
  @Namespace("odrl")
  @IsNotEmpty()
  action: ODRLAction | string;
  @Namespace("odrl")
  @IsOptional()
  target?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  constraint?: Array<Constraint>;

  constructor(value: IPolicyRule) {
    super();
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.action = value.action;
    this.target = value.target;
    this.constraint = value.constraint;
  }
}

@Serializable("odrl:Permission")
export class Permission extends PolicyRule<PermissionDto & ContextDto> {
  @Namespace("odrl")
  @IsNotEmpty()
  target: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  duty?: Array<Duty>;

  constructor(value: IPermission) {
    super(value);
    this.target = value.target;
    this.duty = value.duty;
  }
}

@Serializable("odrl:Prohibition")
export class Prohibition extends PolicyRule<ProhibitionDto & ContextDto> {
  @Namespace("odrl")
  @IsNotEmpty()
  target: string;

  constructor(value: IProhibition) {
    super(value);
    this.target = value.target;
  }
}

@Serializable("odrl:Duty")
export class Duty extends PolicyRule<DutyDto & ContextDto> {}

export interface IPolicy extends IReference {
  assigner?: string;
  assignee?: string;
  profile?: Reference;
  permission?: Array<Permission>;
  prohibition?: Array<Prohibition>;
  obligation?: Array<Duty>;
  target?: string;
}

@Serializable("odrl:Policy")
export class Policy<
  OutType extends ContextDto = PolicyDto & ContextDto
> extends Reference<OutType> {
  @Namespace("odrl")
  @IsString()
  @IsOptional()
  assigner?: string;
  @Namespace("odrl")
  @IsString()
  @IsOptional()
  assignee?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  profile?: Reference;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  permission?: Array<Permission>;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  prohibition?: Array<Prohibition>;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  obligation?: Array<Duty>;
  @Namespace("odrl")
  @IsOptional()
  target?: string;

  constructor(value: IPolicy) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.profile = value.profile;
    this.permission = value.permission;
    this.prohibition = value.prohibition;
    this.obligation = value.obligation;
    this.target = value.target;
  }
}

export interface IOffer extends IPolicy {
  assigner: string;
}

@Serializable("odrl:Offer")
export class Offer extends Policy<OfferDto> {
  @Namespace("odrl")
  @IsNotEmpty()
  assigner: string;

  constructor(value: IOffer) {
    super(value);
    this.assigner = value.assigner;
  }
}

export interface IAgreement extends IPolicy {
  assigner: string;
  assignee: string;
  timestamp: string;
  target: string;
}

@Serializable("odrl:Agreement")
export class Agreement extends Policy<AgreementDto> {
  @Namespace("odrl")
  @IsNotEmpty()
  assigner: string;
  @Namespace("odrl")
  @IsNotEmpty()
  assignee: string;
  @Namespace("dspace")
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  constructor(value: IAgreement) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.timestamp = value.timestamp;
  }
}

export type NegotiationRole = "provider" | "consumer";

export interface INegotiationProcessEvent {
  time: Date;
  state: ContractNegotiationState;
  localMessage?: string;
  code?: string;
  reason?: Multilanguage[];
  agreementMessage?: string;
  verification?: ContractAgreementVerificationMessage;
  type: "local" | "remote";
}

export class NegotiationProcessEvent {
  time: Date;
  state: ContractNegotiationState;
  localMessage?: string;
  code?: string;
  reason?: Multilanguage[];
  agreementMessage?: string;
  verification?: ContractAgreementVerificationMessage;
  type: "local" | "remote";

  constructor(value: INegotiationProcessEvent) {
    this.time = value.time;
    this.state = value.state;
    this.localMessage = value.localMessage;
    this.code = value.code;
    this.reason = value.reason;
    this.agreementMessage = value.agreementMessage;
    this.verification = value.verification;
    this.type = value.type;
  }
}

export interface INegotiationStatus {
  localId: string;
  remoteId: string;
  remoteParty: string;
  role: NegotiationRole;
  remoteAddress: string;
  state: ContractNegotiationState;
  dataSet: string;
}

export interface INegotiationDetail extends INegotiationStatus {
  offer?: Offer;
  agreement?: Agreement;
  events: Array<NegotiationProcessEvent>;
}

export class NegotiationStatus {
  localId: string;
  remoteId: string;
  remoteParty: string;
  role: NegotiationRole;
  remoteAddress: string;
  state: ContractNegotiationState;
  dataSet: string;

  constructor(value: INegotiationStatus) {
    this.localId = value.localId;
    this.remoteId = value.remoteId;
    this.remoteParty = value.remoteParty;
    this.role = value.role;
    this.remoteAddress = value.remoteAddress;
    this.state = value.state;
    this.dataSet = value.dataSet;
  }
}

export class NegotiationDetail extends NegotiationStatus {
  offer?: Offer;
  agreement?: Agreement;
  events: Array<NegotiationProcessEvent>;

  constructor(value: INegotiationDetail) {
    super(value);
    this.offer = value.offer;
    this.agreement = value.agreement;
    this.events = value.events;
  }
}
