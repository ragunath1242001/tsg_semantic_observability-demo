import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { ObjectMetaDto } from "./meta.dto.js";

export class PodSpecDto {
  @ApiProperty({ required: false, type: Number })
  @IsInt()
  @IsOptional()
  activeDeadlineSeconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  affinity?: any;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  automountServiceAccountToken?: boolean;

  @ApiProperty({ type: [Object], required: true })
  @IsArray()
  @IsOptional()
  containers!: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  dnsConfig?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  dnsPolicy?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enableServiceLinks?: boolean;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  ephemeralContainers?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  hostAliases?: any[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hostIPC?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hostNetwork?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hostPID?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  hostUsers?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hostname?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  imagePullSecrets?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  initContainers?: any[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nodeName?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  nodeSelector?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  os?: any;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  overhead?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  preemptionPolicy?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  priorityClassName?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  readinessGates?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  resourceClaims?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  resources?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  restartPolicy?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  runtimeClassName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  schedulerName?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  schedulingGates?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  securityContext?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serviceAccount?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serviceAccountName?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  setHostnameAsFQDN?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  shareProcessNamespace?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  terminationGracePeriodSeconds?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  tolerations?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  topologySpreadConstraints?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  volumes?: any[];
}

export class PodStatusDto {
  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  conditions?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  containerStatuses?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  ephemeralContainerStatuses?: any[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hostIP?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  hostIPs?: any[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  initContainerStatuses?: any[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nominatedNodeName?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  observedGeneration?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phase?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  podIP?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  podIPs?: any[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  qosClass?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resize?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  resourceClaimStatuses?: any[];

  @ApiProperty({ required: false })
  @Type(() => Date)
  @IsOptional()
  startTime?: Date;
}

export class PodDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiVersion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  kind?: string;

  @ApiProperty({ required: false, type: ObjectMetaDto })
  @Type(() => ObjectMetaDto)
  @ValidateNested()
  @IsOptional()
  metadata?: ObjectMetaDto;

  @ApiProperty({ required: false, type: PodSpecDto })
  @Type(() => PodSpecDto)
  @ValidateNested()
  @IsOptional()
  spec?: PodSpecDto;

  @ApiProperty({ required: false, type: PodStatusDto })
  @Type(() => PodStatusDto)
  @ValidateNested()
  @IsOptional()
  status?: PodStatusDto;
}

export class PodListDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiVersion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  kind?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;

  @ApiProperty({ type: [PodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PodDto)
  items!: PodDto[];
}

export class JobDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiVersion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  kind?: string;

  @ApiProperty({ required: false, type: ObjectMetaDto })
  @Type(() => ObjectMetaDto)
  @ValidateNested()
  @IsOptional()
  metadata?: ObjectMetaDto;

  @ApiProperty({ required: false })
  @IsOptional()
  spec?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  status?: any;
}
