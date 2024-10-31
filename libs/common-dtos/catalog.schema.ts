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
  ODRLAction,
  ODRLLeftOperand,
  ODRLOperator,
  PermissionDto,
  Policy,
  PolicyDto,
  PolicyRuleDto,
  ProhibitionDto,
  ResourceDto,
  ValueDto
} from "@tsg-dsp/common-dsp";
import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { DurationSchema, ReferenceSchema } from "./common.schema";

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
  declare "@type": "odrl:Duty";
}

export class PermissionSchema
  extends PolicyRuleSchema
  implements PermissionDto
{
  @ApiProperty()
  declare "@type": "odrl:Permission";
  @ApiProperty()
  declare "odrl:target": string;
  @ApiPropertyOptional()
  "odrl:Duty"?: Array<DutyDto>;
}

export class ProhibitionSchema
  extends PolicyRuleSchema
  implements ProhibitionDto
{
  @ApiProperty()
  declare "@type": "odrl:Prohibition";
  @ApiProperty()
  declare "odrl:target": string;
}
export class PolicySchema extends ReferenceSchema implements PolicyDto {
  @ApiProperty()
  "@type": "odrl:Offer" | "odrl:Agreement";
  @ApiPropertyOptional()
  "odrl:assigner"?: string;
  @ApiPropertyOptional()
  "odrl:assignee"?: string;
  @ApiPropertyOptional()
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
  @ApiPropertyOptional()
  "dcat:contactPoint"?: string;
  @ApiPropertyOptional()
  "dcat:keyword"?: Array<string>;
  @ApiPropertyOptional()
  "dcat:landingPage"?: string;
  @ApiPropertyOptional()
  "dcat:theme"?: Array<string>;
  @ApiPropertyOptional()
  "dcat:conformsTo"?: string;
  @ApiPropertyOptional()
  "dct:creator"?: string;
  @ApiPropertyOptional()
  "dct:description"?: Array<string>;
  @ApiPropertyOptional()
  "dct:identifier"?: string;
  @ApiPropertyOptional()
  "dct:isReferencedBy"?: string;
  @ApiPropertyOptional()
  "dct:issued"?: string;
  @ApiPropertyOptional()
  "dct:language"?: string;
  @ApiPropertyOptional()
  "dct:license"?: string;
  @ApiPropertyOptional()
  "dct:modified"?: string;
  @ApiPropertyOptional()
  "dct:publisher"?: string;
  @ApiPropertyOptional()
  "dct:relation"?: string;
  @ApiPropertyOptional()
  "dct:title"?: string;
  @ApiPropertyOptional()
  "dct:type"?: string;
  @ApiPropertyOptional({ type: [PolicySchema] })
  "odrl:hasPolicy"?: Array<PolicyDto>;
  @ApiPropertyOptional()
  "dcat:hasVersion"?: Array<string>;
  @ApiPropertyOptional()
  "dcat:isVersionOf"?: string;
  @ApiPropertyOptional()
  "dcat:version"?: string;
  @ApiPropertyOptional()
  "dcat:hasCurrentVersion"?: string;
  @ApiPropertyOptional()
  "dcat:previousVersion"?: string;
}

export class DatasetSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DatasetDto
{
  @ApiProperty()
  "@type": "dcat:Dataset";
  @ApiPropertyOptional()
  "dcat:distribution"?: Array<DistributionDto>;
  @ApiPropertyOptional()
  "dcat:spatialResolutionInMeters"?: string;
  @ApiPropertyOptional({ type: DurationSchema })
  "dcat:temporalResolution"?: string;
  @ApiPropertyOptional()
  "dct:accrualPeriodicity"?: string;
  @ApiPropertyOptional()
  "dct:spatial"?: string;
  @ApiPropertyOptional()
  "dct:temporal"?: string;
  @ApiPropertyOptional()
  "prov:wasGeneratedBy"?: string;
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
  @ApiPropertyOptional()
  "dct:description"?: Array<string>;
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
  @ApiPropertyOptional()
  "dct:description"?: Array<string>;
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
  @ApiPropertyOptional()
  "dcat:themeTaxonomy"?: string;
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
