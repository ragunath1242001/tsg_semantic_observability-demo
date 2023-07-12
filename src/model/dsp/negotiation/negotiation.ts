import { Namespace, Serializable } from "../../decorators";
import {
  IReference,
  Reference,
  SerializableClass,
  Time,
  URI,
  Value,
} from "../common";

export enum Action {
  DELETE = "odrl:delete",
  EXECUTE = "odrl:execute",
  SOURCE_CODE = "cc:SourceCode",
  ANONYMIZE = "odrl:anonymize",
  EXTRACT = "odrl:extract",
  READ = "odrl:read",
  INDEX = "odrl:index",
  COMPENSATE = "odrl:compensate",
  SELL = "odrl:sell",
  DERIVE = "odrl:derive",
  ENSURE_EXCLUSIVITY = "odrl:ensureExclusivity",
  ANNOTATE = "odrl:annotate",
  REPRODUCTION = "cc:Reproduction",
  TRANSLATE = "odrl:translate",
  INCLUDE = "odrl:include",
  DERIVATIVE_WORKS = "cc:DerivativeWorks",
  DISTRIBUTION = "cc:Distribution",
  TEXT_TO_SPEECH = "odrl:textToSpeech",
  INFORM = "odrl:inform",
  GRANT_USE = "odrl:grantUse",
  ARCHIVE = "odrl:archive",
  MODIFY = "odrl:modify",
  AGGREGATE = "odrl:aggregate",
  ATTRIBUTE = "odrl:attribute",
  NEXT_POLICY = "odrl:nextPolicy",
  DIGITIZE = "odrl:digitize",
  ATTRIBUTION = "cc:Attribution",
  INSTALL = "odrl:install",
  CONCURRENTUSE = "odrl:concurrentUse",
  DISTRIBUTE = "odrl:distribute",
  SYNCHRONIZE = "odrl:synchronize",
  MOVE = "odrl:move",
  OBTAIN_CONSENT = "odrl:obtainConsent",
  PRINT = "odrl:print",
  NOTICE = "cc:Notice",
  GIVE = "odrl:give",
  UNINSTALL = "odrl:uninstall",
  SHARING = "cc:Sharing",
  REVIEW_POLICY = "odrl:reviewPolicy",
  WATERMARK = "odrl:watermark",
  PLAY = "odrl:play",
  REPRODUCE = "odrl:reproduce",
  TRANSFORM = "odrl:transform",
  DISPLAY = "odrl:display",
  STREAM = "odrl:stream",
  SHARE_ALIKE = "cc:ShareAlike",
  ACCEPT_TRACKING = "odrl:acceptTracking",
  COMMERICAL_USE = "cc:CommericalUse",
  PRESENT = "odrl:present",
  USE = "odrl:use",
}

export enum Operator {
  EQ = "odrl:eq",
  GT = "odrl:gt",
  GTEQ = "odrl:gteq",
  HAS_PART = "odrl:hasPart",
  IS_A = "odrl:isA",
  IS_ALL_OF = "odrl:isAllOf",
  IS_ANY_OF = "odrl:isAnyOf",
  IS_NONE_OF = "odrl:isNoneOf",
  IS_PART_OF = "odrl:isPartOf",
  LT = "odrl:lt",
  LTEQ = "odrl:term-lteq",
  NEQ = "odrl:neq",
}

export enum LeftOperand {
  ABSOLUTE_POSITION = "odrl:absolutePosition",
  ABSOLUTE_SIZE = "odrl:absoluteSize",
  ABSOLUTE_SPATIAL_POSITION = "odrl:absoluteSpatialPosition",
  ABSOLUTE_TEMPORAL_POSITION = "odrl:absoluteTemporalPosition",
  COUNT = "odrl:count",
  DATE_TIME = "odrl:dateTime",
  DELAY_PERIOD = "odrl:delayPeriod",
  DELIVERY_CHANNEL = "odrl:deliveryChannel",
  DEVICE = "odrl:device",
  ELAPSED_TIME = "odrl:elapsedTime",
  EVENT = "odrl:event",
  FILE_FORMAT = "odrl:fileFormat",
  INDUSTRY = "odrl:industry",
  LANGUAGE = "odrl:language",
  MEDIA = "odrl:media",
  METERED_TIME = "odrl:meteredTime",
  PAY_AMOUNT = "odrl:payAmount",
  PERCENTAGE = "odrl:percentage",
  PRODUCT = "odrl:product",
  PURPOSE = "odrl:purpose",
  RECIPIENT = "odrl:recipient",
  RELATIVE_POSITION = "odrl:relativePosition",
  RELATIVE_SIZE = "odrl:relativeSize",
  RELATIVE_SPATIAL_POSITION = "odrl:relativeSpatialPosition",
  RELATIVE_TEMPORAL_POSITION = "odrl:relativeTemporalPosition",
  RESOLUTION = "odrl:resolution",
  SPATIAL = "odrl:spatial",
  SPATIAL_COORDINATES = "odrl:spatialCoordinates",
  SYSTEM = "odrl:system",
  SYSTEM_DEVICE = "odrl:systemDevice",
  TIME_INTERVAL = "odrl:timeInterval",
  UNIT_OF_COUNT = "odrl:unitOfCount",
  VERSION = "odrl:version",
  VIRTUAL_LOCATION = "odrl:virtualLocation",
}

export interface IConstraint {
  leftOperand: LeftOperand;
  operator: Operator;
  rightOperand?: Value;
  rightOperandReference?: Reference;
}

@Serializable("odrl:Constraint")
export class Constraint extends SerializableClass {
  @Namespace("odrl")
  leftOperand: LeftOperand;
  @Namespace("odrl")
  operator: Operator;
  @Namespace("odrl")
  rightOperand?: Value;
  @Namespace("odrl")
  rightOperandReference?: Reference;

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
  action: Action;
  target?: Reference;
  constraint?: Array<Constraint>;
}

export interface IProhibition extends IPolicyRule {
  target: Reference;
}

export interface IDuty extends IPolicyRule {}

export interface IPermission extends IPolicyRule {
  target: Reference;
  duty?: Array<Duty>;
}

@Serializable("odrl:PolicyRule")
export class PolicyRule extends SerializableClass {
  @Namespace("odrl")
  assigner?: Reference;
  @Namespace("odrl")
  assignee?: Reference;
  @Namespace("odrl")
  action: Action;
  @Namespace("odrl")
  target?: Reference;
  @Namespace("odrl")
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
export class Permission extends PolicyRule {
  @Namespace("odrl")
  target: Reference;
  @Namespace("odrl")
  duty?: Array<Duty>;

  constructor(value: IPermission) {
    super(value);
    this.target = value.target;
    this.duty = value.duty;
  }
}

@Serializable("odrl:Prohibition")
export class Prohibition extends PolicyRule {
  @Namespace("odrl")
  target: Reference;

  constructor(value: IProhibition) {
    super(value);
    this.target = value.target;
  }
}

@Serializable("odrl:Duty")
export class Duty extends PolicyRule {}

export interface IPolicy extends IReference {
  assigner?: Reference;
  assignee?: Reference;
  profile?: Reference;
  permission?: Array<Permission>;
  prohibition?: Array<Prohibition>;
  obligation?: Array<Duty>;
}

@Serializable("odrl:Policy")
export class Policy extends Reference {
  @Namespace("odrl")
  assigner?: Reference;
  @Namespace("odrl")
  assignee?: Reference;
  @Namespace("odrl")
  profile?: Reference;
  @Namespace("odrl")
  permission?: Array<Permission>;
  @Namespace("odrl")
  prohibition?: Array<Prohibition>;
  @Namespace("odrl")
  obligation?: Array<Duty>;

  constructor(value: IPolicy) {
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
  assigner: Reference;
}

@Serializable("odrl:Offer")
export class Offer extends Policy {
  @Namespace("odrl")
  assigner: Reference;

  constructor(value: IOffer) {
    super(value);
    this.assigner = value.assigner;
  }
}

export interface IAgreement extends IPolicy {
  assigner: Reference;
  assignee: Reference;
  timestamp: Time;
  consumerId: string;
  providerId: string;
}

@Serializable("odrl:Agreement")
export class Agreement extends Policy {
  @Namespace("odrl")
  assigner: Reference;
  @Namespace("odrl")
  assignee: Reference;
  @Namespace("dspace")
  timestamp: Time;
  @Namespace("dspace")
  consumerId: string;
  @Namespace("dspace")
  providerId: string;

  constructor(value: IAgreement) {
    super(value);
    this.assigner = value.assigner;
    this.assignee = value.assignee;
    this.timestamp = value.timestamp;
    this.consumerId = value.consumerId;
    this.providerId = value.providerId;
  }
}
