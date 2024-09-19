import {
  CatalogDto,
  CatalogRecordDto,
  CatalogRequestMessageDto,
  ConstraintDto,
  DataServiceDto,
  DatasetDto,
  DistributionDto,
  Duty,
  DutyDto,
  Filter,
  MultilanguageDto,
  ODRLAction,
  ODRLLeftOperand,
  ODRLOperator,
  PermissionDto,
  Policy,
  PolicyDto,
  PolicyRuleDto,
  ProhibitionDto,
  ReferenceDto,
  ResourceDto,
  ValueDto,
} from "@tsg-dsp/common-dsp";
import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import {
  DurationSchema,
  MultilanguageSchema,
  ReferenceSchema,
} from "../common.schema";

export class ConstraintSchema implements ConstraintDto {
  @ApiProperty()
  "@type": "odrl:Constraint";
  @ApiProperty()
  "odrl:leftOperand": ODRLLeftOperand | string;
  @ApiProperty()
  "odrl:operator": ODRLOperator | string;
  @ApiPropertyOptional()
  "odrl:rightOperand"?: ValueDto | string;
  @ApiPropertyOptional()
  "odrl:rightOperandReference"?: string;
}

export class PolicyRuleSchema implements PolicyRuleDto {
  @ApiProperty()
  "@type": "odrl:Prohibition" | "odrl:Duty" | "odrl:Permission";
  @ApiPropertyOptional()
  "odrl:assigner"?: string;
  @ApiPropertyOptional()
  "odrl:assignee"?: string;
  @ApiProperty()
  "odrl:action": ODRLAction | string;
  @ApiPropertyOptional()
  "odrl:target"?: string;
  @ApiPropertyOptional({ type: [ConstraintSchema] })
  "odrl:constraint"?: Array<ConstraintDto>;
}

export class DutySchema extends PolicyRuleSchema implements DutyDto {
  @ApiProperty()
  "@type": "odrl:Duty";
}

export class PermissionSchema
  extends PolicyRuleSchema
  implements PermissionDto
{
  @ApiProperty()
  "@type": "odrl:Permission";
  @ApiProperty()
  "odrl:target"!: string;
  @ApiPropertyOptional()
  "odrl:Duty"?: Array<DutyDto>;
}

export class ProhibitionSchema
  extends PolicyRuleSchema
  implements ProhibitionDto
{
  @ApiProperty()
  "@type": "odrl:Prohibition";
  @ApiProperty()
  "odrl:target"!: string;
}
export class PolicySchema extends ReferenceSchema implements PolicyDto {
  @ApiProperty()
  "@type": "odrl:Offer" | "odrl:Agreement";
  @ApiPropertyOptional()
  "odrl:assigner"?: string;
  @ApiPropertyOptional()
  "odrl:assignee"?: string;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "odrl:profile"?: string;
  @ApiPropertyOptional({ type: [PermissionSchema] })
  "odrl:permission"?: Array<PermissionDto>;
  @ApiPropertyOptional({ type: [ProhibitionSchema] })
  "odrl:prohibition"?: Array<ProhibitionDto>;
  @ApiPropertyOptional({ type: [Duty] })
  "odrl:obligation"?: Array<DutyDto>;
  @ApiPropertyOptional()
  "odrl:target"?: string;
}

export class ResourceSchema extends ReferenceSchema implements ResourceDto {
  @ApiProperty()
  "@type": "dcat:Resource";
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:contactPoint"?: ReferenceDto;
  @ApiPropertyOptional()
  "dcat:keyword"?: Array<string>;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:landingPage"?: ReferenceDto;
  @ApiPropertyOptional({ type: [ReferenceSchema] })
  "dcat:theme"?: Array<ReferenceDto>;
  @ApiPropertyOptional()
  "dcat:conformsTo"?: string;
  @ApiPropertyOptional()
  "dct:creator"?: string;
  @ApiPropertyOptional({ type: [MultilanguageSchema] })
  "dct:description"?: Array<MultilanguageDto>;
  @ApiPropertyOptional()
  "dct:identifier"?: string;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:isReferencedBy"?: ReferenceDto;
  @ApiPropertyOptional()
  "dct:issued"?: string;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:language"?: ReferenceDto;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:license"?: ReferenceDto;
  @ApiPropertyOptional()
  "dct:modified"?: string;
  @ApiPropertyOptional()
  "dct:publisher"?: string;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:relation"?: ReferenceDto;
  @ApiPropertyOptional()
  "dct:title"?: string;
  @ApiPropertyOptional()
  "dct:type"?: string;
  @ApiPropertyOptional({ type: [PolicySchema] })
  "odrl:hasPolicy"?: Array<PolicyDto>;
  @ApiPropertyOptional({ type: [ReferenceSchema] })
  "dcat:hasVersion"?: Array<ReferenceDto>;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:isVersionOf"?: ReferenceDto;
  @ApiPropertyOptional()
  "dcat:version"?: string;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:hasCurrentVersion"?: ReferenceDto;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:previousVersion"?: ReferenceDto;
}

export class DatasetSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DatasetDto
{
  @ApiProperty()
  "@type": "dcat:Dataset";
  @ApiPropertyOptional()
  "dcat:distribution"?: Array<DistributionDto>;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:spatialResolutionInMeters"?: ReferenceDto;
  @ApiPropertyOptional({ type: DurationSchema })
  "dcat:temporalResolution"?: string;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:accrualPeriodicity"?: ReferenceDto;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:spatial"?: ReferenceDto;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dct:temporal"?: ReferenceDto;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "prov:wasGeneratedBy"?: ReferenceDto;
}

export class DataServiceSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DataServiceDto
{
  @ApiProperty()
  "@type": "dcat:DataService";
  @ApiPropertyOptional()
  "dcat:endpointDescription"?: string;
  @ApiPropertyOptional()
  "dcat:endpointURL"?: string;
  @ApiPropertyOptional({ type: [DatasetSchema] })
  "dcat:servesDataset"?: Array<DatasetDto>;
}

export class DistributionSchema
  extends ReferenceSchema
  implements DistributionDto
{
  @ApiProperty()
  "@type": "dcat:Distribution";
  @ApiPropertyOptional({ type: [DataServiceSchema] })
  "dcat:accessService"?: Array<DataServiceDto>;
  @ApiPropertyOptional()
  "dcat:accessURL"?: string;
  @ApiPropertyOptional()
  "dcat:byteSize"?: string;
  @ApiPropertyOptional()
  "dcat:compressFormat"?: string;
  @ApiPropertyOptional()
  "dcat:downloadURL"?: string;
  @ApiPropertyOptional()
  "dcat:mediaType"?: string;
  @ApiPropertyOptional()
  "dcat:packageFormat"?: string;
  @ApiPropertyOptional()
  "dcat:spatialResolutionInMeters"?: string;
  @ApiPropertyOptional({ type: DurationSchema })
  "dcat:temporalResolution"?: string;
  @ApiPropertyOptional()
  "dct:conformsTo"?: string[];
  @ApiPropertyOptional({ type: [MultilanguageSchema] })
  "dct:description"?: Array<MultilanguageDto>;
  @ApiPropertyOptional()
  "dct:format"?: string;
  @ApiPropertyOptional()
  "dct:issued"?: string;
  @ApiPropertyOptional()
  "dct:modified"?: string;
  @ApiPropertyOptional()
  "dct:title"?: string;
  @ApiPropertyOptional({ type: [PolicySchema] })
  "dct:hasPolicy"?: Array<Policy>;
}

export class CatalogRecordSchema
  extends ReferenceSchema
  implements CatalogRecordDto
{
  @ApiProperty()
  "@type": "dcat:CatalogRecord";
  @ApiPropertyOptional()
  "dct:conformsTo"?: string[];
  @ApiPropertyOptional({ type: [MultilanguageSchema] })
  "dct:description"?: Array<MultilanguageDto>;
  @ApiPropertyOptional()
  "dct:issued"?: Date;
  @ApiPropertyOptional()
  "dct:modified"?: Date;
  @ApiPropertyOptional()
  "dct:title"?: string;
  @ApiPropertyOptional({ type: ResourceSchema })
  "foaf:primaryTopic"?: ResourceDto;
}
export class CatalogSchema
  extends OmitType(DatasetSchema, ["@type"])
  implements CatalogDto
{
  @ApiProperty()
  "@type": "dcat:Catalog";
  @ApiPropertyOptional({ type: [DatasetSchema] })
  "dcat:dataset"?: Array<DatasetDto>;
  @ApiPropertyOptional({ type: [CatalogRecordSchema] })
  "dcat:record"?: CatalogRecordDto;
  @ApiPropertyOptional({ type: [DataServiceSchema] })
  "dcat:service"?: Array<DataServiceDto>;
  @ApiPropertyOptional({ type: ReferenceSchema })
  "dcat:themeTaxonomy"?: ReferenceDto;
  @ApiPropertyOptional({ type: [ResourceSchema] })
  "dct:hasPart"?: Array<ResourceDto>;
  @ApiPropertyOptional()
  "foaf:homepage"?: string;
}

export class CatalogRequestMessageSchema implements CatalogRequestMessageDto {
  @ApiProperty()
  "@type": "dspace:CatalogRequestMessage";
  @ApiPropertyOptional()
  "dspace:filter"?: Array<Filter>;
}
