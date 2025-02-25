import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { DurationSchema, ReferenceSchema } from "../common.schema.js";
import { ValueDto } from "../common.dto.js";
import { Policy } from "../negotiation/negotiation.js";
import {
  ConstraintDto,
  ODRLLeftOperand,
  ODRLOperator,
  PolicyRuleDto,
  ODRLAction,
  DutyDto,
  PermissionDto,
  ProhibitionDto,
  PolicyDto
} from "../negotiation/negotiation.dto.js";
import {
  ResourceDto,
  DatasetDto,
  DistributionDto,
  DataServiceDto,
  CatalogRecordDto,
  CatalogDto
} from "./catalog.dto.js";
import { CatalogRequestMessageDto, Filter } from "./messages.dto.js";

export class ConstraintSchema implements ConstraintDto {
  @ApiProperty({ example: "odrl:Constraint" })
  "@type": "odrl:Constraint";
  @ApiProperty({ example: "odrl:leftOperandExample" })
  "odrl:leftOperand": ODRLLeftOperand | string;
  @ApiProperty({ example: "odrl:operatorExample" })
  "odrl:operator": ODRLOperator | string;
  @ApiPropertyOptional({ example: { value: "rightOperandExample" } })
  "odrl:rightOperand"?: ValueDto | string;
  @ApiPropertyOptional({ example: "rightOperandReferenceExample" })
  "odrl:rightOperandReference"?: string;
}

export class PolicyRuleSchema implements PolicyRuleDto {
  @ApiProperty({ example: "odrl:Permission" })
  "@type": "odrl:Prohibition" | "odrl:Duty" | "odrl:Permission";
  @ApiPropertyOptional({ example: "assignerExample" })
  "odrl:assigner"?: string;
  @ApiPropertyOptional({ example: "assigneeExample" })
  "odrl:assignee"?: string;
  @ApiProperty({ example: "odrl:actionExample" })
  "odrl:action": ODRLAction | string;
  @ApiPropertyOptional({ example: "targetExample" })
  "odrl:target"?: string;
  @ApiPropertyOptional({ type: [ConstraintSchema], example: [] })
  "odrl:constraint"?: Array<ConstraintDto>;
}

export class DutySchema extends PolicyRuleSchema implements DutyDto {
  @ApiProperty({ example: "odrl:Duty" })
  declare "@type": "odrl:Duty";
}

export class PermissionSchema
  extends PolicyRuleSchema
  implements PermissionDto
{
  @ApiProperty({ example: "odrl:Permission" })
  declare "@type": "odrl:Permission";
  @ApiProperty({ example: "targetExample" })
  declare "odrl:target": string;
  @ApiPropertyOptional({ example: [] })
  "odrl:Duty"?: Array<DutyDto>;
}

export class ProhibitionSchema
  extends PolicyRuleSchema
  implements ProhibitionDto
{
  @ApiProperty({ example: "odrl:Prohibition" })
  declare "@type": "odrl:Prohibition";
  @ApiProperty({ example: "targetExample" })
  declare "odrl:target": string;
}

export class PolicySchema extends ReferenceSchema implements PolicyDto {
  @ApiProperty({ example: "odrl:Offer" }) // or "odrl:Agreement"
  "@type": "odrl:Offer" | "odrl:Agreement";
  @ApiPropertyOptional({ example: "assignerExample" })
  "odrl:assigner"?: string;
  @ApiPropertyOptional({ example: "assigneeExample" })
  "odrl:assignee"?: string;
  @ApiPropertyOptional({ example: "profileExample" })
  "odrl:profile"?: string;
  @ApiPropertyOptional({ type: [PermissionSchema], example: [] })
  "odrl:permission"?: Array<PermissionDto>;
  @ApiPropertyOptional({ type: [ProhibitionSchema], example: [] })
  "odrl:prohibition"?: Array<ProhibitionDto>;
  @ApiPropertyOptional({ type: [DutySchema], example: [] })
  "odrl:obligation"?: Array<DutyDto>;
  @ApiPropertyOptional({ example: "targetExample" })
  "odrl:target"?: string;
}

export class ResourceSchema extends ReferenceSchema implements ResourceDto {
  @ApiProperty({ example: "dcat:Resource" })
  "@type": "dcat:Resource";
  @ApiPropertyOptional({ example: "contactPointExample" })
  "dcat:contactPoint"?: string;
  @ApiPropertyOptional({ example: ["keyword1", "keyword2"] })
  "dcat:keyword"?: Array<string>;
  @ApiPropertyOptional({ example: "landingPageExample" })
  "dcat:landingPage"?: string;
  @ApiPropertyOptional({ example: ["theme1", "theme2"] })
  "dcat:theme"?: Array<string>;
  @ApiPropertyOptional({ example: "conformsToExample" })
  "dcat:conformsTo"?: string;
  @ApiPropertyOptional({ example: "creatorExample" })
  "dct:creator"?: string;
  @ApiPropertyOptional({ example: ["description1", "description2"] })
  "dct:description"?: Array<string>;
  @ApiPropertyOptional({ example: "identifierExample" })
  "dct:identifier"?: string;
  @ApiPropertyOptional({ example: "isReferencedByExample" })
  "dct:isReferencedBy"?: string;
  @ApiPropertyOptional({ example: "2020-01-01" })
  "dct:issued"?: string;
  @ApiPropertyOptional({ example: "en" })
  "dct:language"?: string;
  @ApiPropertyOptional({ example: "licenseExample" })
  "dct:license"?: string;
  @ApiPropertyOptional({ example: "2020-01-02" })
  "dct:modified"?: string;
  @ApiPropertyOptional({ example: "publisherExample" })
  "dct:publisher"?: string;
  @ApiPropertyOptional({ example: "relationExample" })
  "dct:relation"?: string;
  @ApiPropertyOptional({ example: "titleExample" })
  "dct:title"?: string;
  @ApiPropertyOptional({ example: "typeExample" })
  "dct:type"?: string;
  @ApiPropertyOptional({ type: [PolicySchema], example: [] })
  "odrl:hasPolicy"?: Array<PolicyDto>;
  @ApiPropertyOptional({ example: ["version1", "version2"] })
  "dcat:hasVersion"?: Array<string>;
  @ApiPropertyOptional({ example: "isVersionOfExample" })
  "dcat:isVersionOf"?: string;
  @ApiPropertyOptional({ example: "versionExample" })
  "dcat:version"?: string;
  @ApiPropertyOptional({ example: "hasCurrentVersionExample" })
  "dcat:hasCurrentVersion"?: string;
  @ApiPropertyOptional({ example: "previousVersionExample" })
  "dcat:previousVersion"?: string;
}

export class DatasetSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DatasetDto
{
  @ApiProperty({ example: "dcat:Dataset" })
  "@type": "dcat:Dataset";
  @ApiPropertyOptional()
  "dcat:distribution"?: Array<DistributionDto>;
  @ApiPropertyOptional({ example: "100" })
  "dcat:spatialResolutionInMeters"?: string;
  @ApiPropertyOptional({ type: DurationSchema, example: "P1Y" })
  "dcat:temporalResolution"?: string;
  @ApiPropertyOptional({ example: "accrualPeriodicityExample" })
  "dct:accrualPeriodicity"?: string;
  @ApiPropertyOptional({ example: "spatialExample" })
  "dct:spatial"?: string;
  @ApiPropertyOptional({ example: "temporalExample" })
  "dct:temporal"?: string;
  @ApiPropertyOptional({ example: "wasGeneratedByExample" })
  "prov:wasGeneratedBy"?: string;
}

export class DataServiceSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DataServiceDto
{
  @ApiProperty({ example: "dcat:DataService" })
  "@type": "dcat:DataService";
  @ApiPropertyOptional({ example: "endpointDescriptionExample" })
  "dcat:endpointDescription"?: string;
  @ApiPropertyOptional({ example: "https://example.com/api" })
  "dcat:endpointURL"?: string;
  @ApiPropertyOptional({ type: [DatasetSchema], example: [] })
  "dcat:servesDataset"?: Array<DatasetDto>;
}

export class DistributionSchema
  extends ReferenceSchema
  implements DistributionDto
{
  @ApiProperty({ example: "dcat:Distribution" })
  "@type": "dcat:Distribution";
  @ApiPropertyOptional({ type: [DataServiceSchema], example: [] })
  "dcat:accessService"?: Array<DataServiceDto>;
  @ApiPropertyOptional({ example: "https://example.com/access" })
  "dcat:accessURL"?: string;
  @ApiPropertyOptional({ example: "12345" })
  "dcat:byteSize"?: string;
  @ApiPropertyOptional({ example: "zip" })
  "dcat:compressFormat"?: string;
  @ApiPropertyOptional({ example: "https://example.com/download" })
  "dcat:downloadURL"?: string;
  @ApiPropertyOptional({ example: "application/json" })
  "dcat:mediaType"?: string;
  @ApiPropertyOptional({ example: "packageFormatExample" })
  "dcat:packageFormat"?: string;
  @ApiPropertyOptional({ example: "200" })
  "dcat:spatialResolutionInMeters"?: string;
  @ApiPropertyOptional({ type: DurationSchema, example: "P2M" })
  "dcat:temporalResolution"?: string;
  @ApiPropertyOptional({
    example: ["conformsToExample1", "conformsToExample2"]
  })
  "dct:conformsTo"?: string[];
  @ApiPropertyOptional({ example: ["First description", "Second description"] })
  "dct:description"?: Array<string>;
  @ApiPropertyOptional({ example: "formatExample" })
  "dct:format"?: string;
  @ApiPropertyOptional({ example: "2020-02-01" })
  "dct:issued"?: string;
  @ApiPropertyOptional({ example: "2020-02-02" })
  "dct:modified"?: string;
  @ApiPropertyOptional({ example: "Title example" })
  "dct:title"?: string;
  @ApiPropertyOptional({ type: [PolicySchema], example: [] })
  "dct:hasPolicy"?: Array<Policy>;
}

export class CatalogRecordSchema
  extends ReferenceSchema
  implements CatalogRecordDto
{
  @ApiProperty({ example: "dcat:CatalogRecord" })
  "@type": "dcat:CatalogRecord";
  @ApiPropertyOptional({ example: ["conformsToExample"] })
  "dct:conformsTo"?: string[];
  @ApiPropertyOptional({ example: ["Record description"] })
  "dct:description"?: Array<string>;
  @ApiPropertyOptional({ example: "2020-03-01T00:00:00Z" })
  "dct:issued"?: Date;
  @ApiPropertyOptional({ example: "2020-03-02T00:00:00Z" })
  "dct:modified"?: Date;
  @ApiPropertyOptional({ example: "Catalog title example" })
  "dct:title"?: string;
  @ApiPropertyOptional({ type: ResourceSchema, example: {} })
  "foaf:primaryTopic"?: ResourceDto;
}

export class CatalogSchema
  extends OmitType(DatasetSchema, ["@type"])
  implements CatalogDto
{
  @ApiProperty({ example: "dcat:Catalog" })
  "@type": "dcat:Catalog";
  @ApiPropertyOptional({ type: [DatasetSchema], example: [] })
  "dcat:dataset"?: Array<DatasetDto>;
  @ApiPropertyOptional({ type: [CatalogRecordSchema], example: {} })
  "dcat:record"?: CatalogRecordDto;
  @ApiPropertyOptional({ type: [DataServiceSchema], example: [] })
  "dcat:service"?: Array<DataServiceDto>;
  @ApiPropertyOptional({ example: "themeTaxonomyExample" })
  "dcat:themeTaxonomy"?: string;
  @ApiPropertyOptional({ type: [ResourceSchema], example: [] })
  "dct:hasPart"?: Array<ResourceDto>;
  @ApiPropertyOptional({ example: "https://example.com/homepage" })
  "foaf:homepage"?: string;
}

export class CatalogRequestMessageSchema implements CatalogRequestMessageDto {
  @ApiProperty({ example: "dspace:CatalogRequestMessage" })
  "@type": "dspace:CatalogRequestMessage";
  @ApiPropertyOptional({ example: [] })
  "dspace:filter"?: Array<Filter>;
}
