import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";

import { ValueDto } from "../common.dto.js";
import { DurationSchema, ReferenceSchema } from "../common.schema.js";
import {
  ConstraintDto,
  DutyDto,
  ODRLAction,
  ODRLLeftOperand,
  ODRLOperator,
  PermissionDto,
  PolicyDto,
  PolicyRuleDto,
  ProhibitionDto
} from "../negotiation/negotiation.dto.js";
import {
  CatalogDto,
  CatalogRecordDto,
  DataServiceDto,
  DatasetDto,
  DistributionDto,
  ResourceDto
} from "./catalog.dto.js";
import { CatalogRequestMessageDto, Filter } from "./messages.dto.js";

export class ConstraintSchema implements ConstraintDto {
  @ApiProperty({ example: "Constraint" })
  "@type": "Constraint";
  @ApiProperty({ example: "leftOperandExample" })
  "leftOperand": ODRLLeftOperand | string;
  @ApiProperty({ example: "operatorExample" })
  "operator": ODRLOperator | string;
  @ApiPropertyOptional({ example: { value: "rightOperandExample" } })
  "rightOperand"?: ValueDto | string;
  @ApiPropertyOptional({ example: "rightOperandReferenceExample" })
  "rightOperandReference"?: string;
}

export class PolicyRuleSchema implements PolicyRuleDto {
  @ApiProperty({ example: "Permission" })
  "@type": "Prohibition" | "Duty" | "Permission";
  @ApiPropertyOptional({ example: "assignerExample" })
  "assigner"?: string;
  @ApiPropertyOptional({ example: "assigneeExample" })
  "assignee"?: string;
  @ApiProperty({ example: "actionExample" })
  "action": ODRLAction | string;
  @ApiPropertyOptional({ example: "targetExample" })
  "target"?: string;
  @ApiPropertyOptional({ type: [ConstraintSchema], example: [] })
  "constraint"?: Array<ConstraintDto>;
}

export class DutySchema extends PolicyRuleSchema implements DutyDto {
  @ApiProperty({ example: "Duty" })
  declare "@type": "Duty";
}

export class PermissionSchema
  extends PolicyRuleSchema
  implements PermissionDto
{
  @ApiProperty({ example: "Permission" })
  declare "@type": "Permission";
  @ApiProperty({ example: "targetExample" })
  declare "target": string;
  @ApiPropertyOptional({ example: [] })
  "Duty"?: Array<DutyDto>;
}

export class ProhibitionSchema
  extends PolicyRuleSchema
  implements ProhibitionDto
{
  @ApiProperty({ example: "Prohibition" })
  declare "@type": "Prohibition";
  @ApiProperty({ example: "targetExample" })
  declare "target": string;
}

export class PolicySchema extends ReferenceSchema implements PolicyDto {
  @ApiProperty({ example: "Offer" }) // or "Agreement"
  "@type": "Offer" | "Agreement";
  @ApiPropertyOptional({ example: "assignerExample" })
  "assigner"?: string;
  @ApiPropertyOptional({ example: "assigneeExample" })
  "assignee"?: string;
  @ApiPropertyOptional({ example: "profileExample" })
  "profile"?: string;
  @ApiPropertyOptional({ type: [PermissionSchema], example: [] })
  "permission"?: Array<PermissionDto>;
  @ApiPropertyOptional({ type: [ProhibitionSchema], example: [] })
  "prohibition"?: Array<ProhibitionDto>;
  @ApiPropertyOptional({ type: [DutySchema], example: [] })
  "obligation"?: Array<DutyDto>;
  @ApiPropertyOptional({ example: "targetExample" })
  "target"?: string;
}

export class ResourceSchema extends ReferenceSchema implements ResourceDto {
  @ApiProperty({ example: "Resource" })
  "@type": "Resource";
  @ApiPropertyOptional({ example: "contactPointExample" })
  "contactPoint"?: string;
  @ApiPropertyOptional({ example: ["keyword1", "keyword2"] })
  "keyword"?: Array<string>;
  @ApiPropertyOptional({ example: "landingPageExample" })
  "landingPage"?: string;
  @ApiPropertyOptional({ example: ["theme1", "theme2"] })
  "theme"?: Array<string>;
  @ApiPropertyOptional({ example: ["conformsToExample"] })
  "conformsTo"?: Array<string>;
  @ApiPropertyOptional({ example: "creatorExample" })
  "creator"?: string;
  @ApiPropertyOptional({ example: ["description1", "description2"] })
  "description"?: Array<string>;
  @ApiPropertyOptional({ example: "identifierExample" })
  "identifier"?: string;
  @ApiPropertyOptional({ example: "isReferencedByExample" })
  "isReferencedBy"?: string;
  @ApiPropertyOptional({ example: "2020-01-01" })
  "issued"?: string;
  @ApiPropertyOptional({ example: "en" })
  "language"?: string;
  @ApiPropertyOptional({ example: "licenseExample" })
  "license"?: string;
  @ApiPropertyOptional({ example: "2020-01-02" })
  "modified"?: string;
  @ApiPropertyOptional({ example: "publisherExample" })
  "publisher"?: string;
  @ApiPropertyOptional({ example: "relationExample" })
  "relation"?: string;
  @ApiPropertyOptional({ example: "titleExample" })
  "title"?: string;
  @ApiPropertyOptional({ example: "typeExample" })
  "type"?: string;
  @ApiPropertyOptional({ type: [PolicySchema], example: [] })
  "hasPolicy"?: Array<PolicyDto>;
  @ApiPropertyOptional({ example: ["version1", "version2"] })
  "hasVersion"?: Array<string>;
  @ApiPropertyOptional({ example: "isVersionOfExample" })
  "isVersionOf"?: string;
  @ApiPropertyOptional({ example: "versionExample" })
  "version"?: string;
  @ApiPropertyOptional({ example: "hasCurrentVersionExample" })
  "hasCurrentVersion"?: string;
  @ApiPropertyOptional({ example: "previousVersionExample" })
  "previousVersion"?: string;
}

export class DatasetSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DatasetDto
{
  @ApiProperty({ example: "Dataset" })
  "@type": "Dataset";
  @ApiPropertyOptional()
  "distribution"?: Array<DistributionDto>;
  @ApiPropertyOptional({ example: "100" })
  "spatialResolutionInMeters"?: string;
  @ApiPropertyOptional({ type: DurationSchema, example: "P1Y" })
  "temporalResolution"?: string;
  @ApiPropertyOptional({ example: "accrualPeriodicityExample" })
  "accrualPeriodicity"?: string;
  @ApiPropertyOptional({ example: "spatialExample" })
  "spatial"?: string;
  @ApiPropertyOptional({ example: "temporalExample" })
  "temporal"?: string;
  @ApiPropertyOptional({ example: "wasGeneratedByExample" })
  "wasGeneratedBy"?: string;
}

export class DataServiceSchema
  extends OmitType(ResourceSchema, ["@type"])
  implements DataServiceDto
{
  @ApiProperty({ example: "DataService" })
  "@type": "DataService";
  @ApiPropertyOptional({ example: "endpointDescriptionExample" })
  "endpointDescription"?: string;
  @ApiPropertyOptional({ example: "https://example.com/api" })
  "endpointURL"?: string;
  @ApiPropertyOptional({ type: [DatasetSchema], example: [] })
  "servesDataset"?: Array<DatasetDto>;
}

export class DistributionSchema
  extends ReferenceSchema
  implements DistributionDto
{
  @ApiProperty({ example: "Distribution" })
  "@type": "Distribution";
  @ApiPropertyOptional({ type: DataServiceSchema, example: [] })
  "accessService"?: Array<DataServiceDto>;
  @ApiPropertyOptional({ example: "https://example.com/access" })
  "accessURL"?: string;
  @ApiPropertyOptional({ example: "12345" })
  "byteSize"?: string;
  @ApiPropertyOptional({ example: "zip" })
  "compressFormat"?: string;
  @ApiPropertyOptional({ example: "https://example.com/download" })
  "downloadURL"?: string;
  @ApiPropertyOptional({ example: "application/json" })
  "mediaType"?: string;
  @ApiPropertyOptional({ example: "packageFormatExample" })
  "packageFormat"?: string;
  @ApiPropertyOptional({ example: "200" })
  "spatialResolutionInMeters"?: string;
  @ApiPropertyOptional({ type: DurationSchema, example: "P2M" })
  "temporalResolution"?: string;
  @ApiPropertyOptional({
    example: ["conformsToExample1", "conformsToExample2"]
  })
  "conformsTo"?: string[];
  @ApiPropertyOptional({ example: ["First description", "Second description"] })
  "description"?: Array<string>;
  @ApiPropertyOptional({ example: "formatExample" })
  "format"?: string;
  @ApiPropertyOptional({ example: "2020-02-01" })
  "issued"?: string;
  @ApiPropertyOptional({ example: "2020-02-02" })
  "modified"?: string;
  @ApiPropertyOptional({ example: "Title example" })
  "title"?: string;
  @ApiPropertyOptional({ type: [PolicySchema], example: [] })
  "hasPolicy"?: Array<PolicyDto>;
}

export class CatalogRecordSchema
  extends ReferenceSchema
  implements CatalogRecordDto
{
  @ApiProperty({ example: "CatalogRecord" })
  "@type": "CatalogRecord";
  @ApiPropertyOptional({ example: ["conformsToExample"] })
  "conformsTo"?: string[];
  @ApiPropertyOptional({ example: ["Record description"] })
  "description"?: Array<string>;
  @ApiPropertyOptional({ example: "2020-03-01T00:00:00Z" })
  "issued"?: Date;
  @ApiPropertyOptional({ example: "2020-03-02T00:00:00Z" })
  "modified"?: Date;
  @ApiPropertyOptional({ example: "Catalog title example" })
  "title"?: string;
  @ApiPropertyOptional({ type: ResourceSchema, example: {} })
  "primaryTopic"?: ResourceDto;
}

export class CatalogSchema
  extends OmitType(DatasetSchema, ["@type"])
  implements CatalogDto
{
  @ApiProperty({ example: "Catalog" })
  "@type": "Catalog";
  @ApiPropertyOptional({ type: [DatasetSchema], example: [] })
  "dataset"?: Array<DatasetDto>;
  @ApiPropertyOptional({ type: [CatalogRecordSchema], example: {} })
  "record"?: CatalogRecordDto;
  @ApiPropertyOptional({ type: [DataServiceSchema], example: [] })
  "service"?: Array<DataServiceDto>;
  @ApiPropertyOptional({ example: "themeTaxonomyExample" })
  "themeTaxonomy"?: string;
  @ApiPropertyOptional({ type: [ResourceSchema], example: [] })
  "hasPart"?: Array<ResourceDto>;
  @ApiPropertyOptional({ example: "https://example.com/homepage" })
  "homepage"?: string;
}

export class CatalogRequestMessageSchema implements CatalogRequestMessageDto {
  @ApiProperty({ example: "CatalogRequestMessage" })
  "@type": "CatalogRequestMessage";
  @ApiPropertyOptional({ example: [] })
  "filter"?: Array<Filter>;
}
