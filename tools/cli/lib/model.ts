/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";

import { Exclude, plainToInstance, Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInstance,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested
} from "class-validator";

import { log } from "./utils.js";

export class DataPlane {
  @IsString()
  @IsOptional()
  public readonly type?: string;

  @IsBoolean()
  @IsOptional()
  public readonly tsgDataPlane: boolean = true;

  @IsBoolean()
  @IsOptional()
  public readonly postgres: boolean = true;

  @IsString()
  @IsOptional()
  public readonly subPath?: string;

  @IsString()
  @IsOptional()
  public readonly dnsPrefix?: string;

  @IsObject()
  @IsOptional()
  public readonly config?: Record<string, any>;
}

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

  @ValidateNested({ each: true })
  @IsOptional()
  @IsInstance(Map)
  @Type(() => DataPlane)
  public dataPlanes: Map<string, DataPlane> = new Map<string, DataPlane>();

  @Exclude()
  generateTestService(warn: boolean = true) {
    if (this.hasTestService) {
      const dataPlane: DataPlane = plainToInstance<DataPlane, DataPlane>(
        DataPlane,
        {
          type: "http-data-plane",
          postgres: true,
          tsgDataPlane: true,
          subPath: "http-data-plane",
          config: {
            dataset: {
              type: "versioned",
              title: `${this.name} HTTPBin`,
              currentVersion: "0.9.2",
              versions: [
                {
                  version: "0.9.2",
                  distributions: [
                    {
                      backendUrl: "https://httpbin.org/",
                      openApiSpecRef: "https://httpbin.org/spec.json"
                    }
                  ]
                }
              ],
              policy: {
                type: "default"
              }
            }
          }
        }
      );
      this.dataPlanes.set("http-data-plane", dataPlane);
      if (warn) {
        log(
          "warn",
          "Injected test http-data-plane, must only be used for testing purposes"
        );
      }
    }
  }
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
  public readonly chartVersion?: string;

  @IsString()
  @IsOptional()
  public readonly chartName?: string;

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
  public readonly ssoBridge?: Application;
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly wallet?: Application;
  @ValidateNested()
  @IsOptional()
  @Type(() => Application)
  public readonly controlPlane?: Application;
  @ValidateNested({ each: true })
  @IsOptional()
  @IsInstance(Map)
  @Type(() => Application)
  public readonly dataPlanes?: Map<string, Application>;
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
