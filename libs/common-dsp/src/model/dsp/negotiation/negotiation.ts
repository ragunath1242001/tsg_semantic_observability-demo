import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested
} from "class-validator";
import { LDType, Namespace, Serializable } from "../../decorators.js";
import {
  IReference,
  Multilanguage,
  Reference,
  SerializableClass,
  Value,
  withExtraProps
} from "../common.js";
import { ContractAgreementVerificationMessage } from "./messages.js";
import {
  createInstances,
  createOptionalInstance,
  createOptionalInstances
} from "../../../utils/instances.js";
import { ContextDto } from "../common.dto.js";
import {
  ODRLLeftOperand,
  ODRLOperator,
  ConstraintDto,
  ODRLAction,
  PermissionDto,
  DutyDto,
  PolicyDto,
  OfferDto,
  AgreementDto
} from "./negotiation.dto.js";
import { ContractNegotiationState, HashedMessage } from "./messages.dto.js";
import { OrArray } from "../../../utils/unions.js";

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
  @ValidateIf((o: Constraint) => typeof o.rightOperand !== "string")
  @ValidateNested()
  rightOperand?: Value | string;
  @Namespace("odrl")
  @ValidateIf((o: Constraint) => o.rightOperand === undefined)
  @ValidateNested()
  @IsNotEmpty()
  rightOperandReference?: string;

  constructor(value: withExtraProps<IConstraint>) {
    super(value);
    this.rightOperand = value.rightOperand;
    this.rightOperandReference = value.rightOperandReference;
    this.leftOperand = value.leftOperand;
    this.operator = value.operator;
  }
}

export interface IPolicyRule {
  assigner?: string;
  assignee?: OrArray<string>;
  action: OrArray<ODRLAction | string>;
  target?: string;
  constraint?: Array<Constraint>;
}

export interface IProhibition extends IPolicyRule {}

export type IDuty = IPolicyRule;

export interface IPermission extends IPolicyRule {
  duty?: Array<Duty>;
}

@Serializable("odrl:PolicyRule")
export class PolicyRule<
  OutType extends ContextDto
> extends SerializableClass<OutType> {
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  assigner?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  assignee?: OrArray<string>;
  @Namespace("odrl")
  @IsNotEmpty()
  action: OrArray<ODRLAction | string>;
  @Namespace("odrl")
  @IsOptional()
  target?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Constraint)
  constraint?: Array<Constraint>;

  constructor(value: withExtraProps<IPolicyRule>) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.action = value.action;
    this.target = value.target;
    this.constraint = createOptionalInstances(value.constraint, Constraint);
  }
}

@Serializable("odrl:Permission")
export class Permission extends PolicyRule<PermissionDto & ContextDto> {
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Duty)
  duty?: Array<Duty>;

  constructor(value: withExtraProps<IPermission>) {
    super(value);
    this.duty = createOptionalInstances(value.duty, Duty);
  }
}

@Serializable("odrl:Prohibition")
export class Prohibition extends PolicyRule<DutyDto & ContextDto> {}

@Serializable("odrl:Duty")
export class Duty extends PolicyRule<DutyDto & ContextDto> {}

export interface IPolicy extends IReference {
  assigner?: string;
  assignee?: OrArray<string>;
  profile?: string;
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
  assignee?: OrArray<string>;
  @Namespace("odrl")
  @IsString()
  @IsOptional()
  profile?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Permission)
  permission?: Array<Permission>;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Prohibition)
  prohibition?: Array<Prohibition>;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Duty)
  obligation?: Array<Duty>;
  @Namespace("odrl")
  @IsOptional()
  target?: string;

  constructor(value: withExtraProps<IPolicy>) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.profile = value.profile;
    this.permission = createOptionalInstances(value.permission, Permission);
    this.prohibition = createOptionalInstances(value.prohibition, Prohibition);
    this.obligation = createOptionalInstances(value.obligation, Duty);
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
  declare assigner: string;

  constructor(value: withExtraProps<IOffer>) {
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
  declare assigner: string;
  @Namespace("odrl")
  @IsNotEmpty()
  declare assignee: string;
  @Namespace("dspace")
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  constructor(value: withExtraProps<IAgreement>) {
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
  hashedMessage?: HashedMessage;
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
  hashedMessage?: HashedMessage;
  type: "local" | "remote";

  constructor(value: withExtraProps<INegotiationProcessEvent>) {
    this.time = value.time;
    this.state = value.state;
    this.localMessage = value.localMessage;
    this.code = value.code;
    this.reason = value.reason;
    this.agreementMessage = value.agreementMessage;
    this.verification = value.verification;
    this.hashedMessage = value.hashedMessage;
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
  agreementId?: string;
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

  constructor(value: withExtraProps<INegotiationStatus>) {
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
  agreementId?: string;
  events: Array<NegotiationProcessEvent>;

  constructor(value: withExtraProps<INegotiationDetail>) {
    super(value);
    this.offer = createOptionalInstance(value.offer, Offer);
    this.agreement = createOptionalInstance(value.agreement, Agreement);
    this.agreementId = value.agreementId;
    this.events = createInstances(value.events, NegotiationProcessEvent);
  }
}
