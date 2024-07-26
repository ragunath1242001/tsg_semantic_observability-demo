import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import "reflect-metadata";

export class Participant {
  @IsString()
  public readonly host!: string;

  @IsString()
  public readonly id!: string;

  @IsString()
  public readonly name!: string;

  @IsString()
  @IsIn(["path", "subdomain"])
  public readonly routing: "path" | "subdomain" = "path";

  @IsBoolean()
  @IsOptional()
  public readonly hasControlPlane: boolean = false;
  @IsBoolean()
  @IsOptional()
  public readonly hasDataPlane: boolean = false;
  @IsBoolean()
  @IsOptional()
  public readonly hasTestService: boolean = false;
  @IsBoolean()
  @IsOptional()
  public readonly hasDebugLogging: boolean = false;

  @IsBoolean()
  @IsOptional()
  public readonly issuer: boolean = false;

  @IsObject()
  @ValidateIf((p) => p.issuer)
  public readonly document?: any;
  @IsObject()
  @ValidateIf((p) => p.issuer)
  public readonly schema?: any;

  @IsObject()
  @IsOptional()
  public readonly credentialSubject?: any;

  @IsString()
  @IsOptional()
  public readonly preAuthorizationCode?: string;
}

export class General {
  @IsString()
  @Matches(/[a-zA-Z-]+/)
  public readonly namespace!: string;

  @IsString()
  public readonly username!: string;

  @IsString()
  public readonly password!: string;

  @IsString()
  public readonly authorityDomain!: string;

  @IsString()
  public readonly credentialType!: string;
}

export class Application {
  @IsString()
  @IsOptional()
  public readonly chart?: string;

  @IsBoolean()
  @IsOptional()
  public readonly developmentChart: boolean = false;

  @IsString()
  @IsOptional()
  public readonly imageTag?: string;

  @IsString()
  @IsOptional()
  public readonly imageRepository?: string;
}

export class Applications {
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly postgres?: Application;
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly casdoor?: Application;
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly wallet?: Application;
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly controlPlane?: Application;
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly dataPlane?: Application;
}

export class Ecosystem {
  @ValidateNested()
  @Type(() => General)
  @IsDefined()
  public readonly general!: General;

  @ValidateNested()
  @Type(() => Applications)
  @IsOptional()
  public readonly applications?: Applications;

  @ValidateNested({ each: true })
  @Type(() => Participant)
  @IsDefined()
  public readonly participants!: Participant[];
}

export class SingleParticipant {
  @ValidateNested()
  @Type(() => General)
  @IsDefined()
  public readonly general!: General;

  @ValidateNested()
  @Type(() => Applications)
  @IsOptional()
  public readonly applications?: Applications;

  @ValidateNested()
  @Type(() => Participant)
  @IsDefined()
  public readonly participant!: Participant;
}
