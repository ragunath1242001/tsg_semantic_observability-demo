import { OrArray } from "../../../utils/unions";
import { ValueDto, ReferenceDto, ContextDto } from "../common.dto";

export enum ODRLAction {
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

export enum ODRLOperator {
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

export enum ODRLLeftOperand {
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

export interface ConstraintDto {
  "@type": "odrl:Constraint";
  "odrl:leftOperand": ODRLLeftOperand | string;
  "odrl:operator": ODRLOperator | string;
  "odrl:rightOperand"?: ValueDto | string;
  "odrl:rightOperandReference"?: string;
}

export interface PolicyRuleDto {
  "@type": "odrl:Prohibition" | "odrl:Duty" | "odrl:Permission";
  "odrl:assigner"?: string;
  "odrl:assignee"?: OrArray<string>;
  "odrl:action": OrArray<ODRLAction | string>;
  "odrl:target"?: string;
  "odrl:constraint"?: Array<ConstraintDto>;
}

export interface ProhibitionDto extends PolicyRuleDto {
  "@type": "odrl:Prohibition";
  // "odrl:target": string;
}

export interface DutyDto extends PolicyRuleDto {
  "@type": "odrl:Duty";
}

export interface PermissionDto extends PolicyRuleDto {
  "@type": "odrl:Permission";
  // "odrl:target": string;
  "odrl:duty"?: Array<DutyDto>;
}

export interface PolicyDto extends ReferenceDto {
  "@type": "odrl:Offer" | "odrl:Agreement";
  "odrl:assigner"?: string;
  "odrl:assignee"?: OrArray<string>;
  "odrl:target"?: string;
  "odrl:profile"?: string;
  "odrl:permission"?: Array<PermissionDto>;
  "odrl:prohibition"?: Array<ProhibitionDto>;
  "odrl:obligation"?: Array<DutyDto>;
}

export interface OfferDto extends ContextDto, PolicyDto {
  "@type": "odrl:Offer";
  "odrl:assigner": string;
}

export interface AgreementDto extends ContextDto, PolicyDto {
  "@type": "odrl:Agreement";
  "odrl:assigner": string;
  "odrl:assignee": string;
  "dspace:timestamp": string;
  "odrl:target": string;
}
