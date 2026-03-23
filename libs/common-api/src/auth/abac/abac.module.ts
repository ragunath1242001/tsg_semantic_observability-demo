import { DynamicModule, Module, Provider } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Resource } from "@tsg-dsp/common-dtos";
import { Repository } from "typeorm";

import { OwnableEntity } from "../../model/ownable.entity.js";
import { AbacPolicyService } from "./abac.policy.service.js";
import { getOwnershipCheckerToken } from "./ownership.decorator.js";
import {
  GenericOwnershipService,
  OwnershipChecker,
  OwnershipRegistry
} from "./ownership.service.js";

export interface OwnableEntityConfig<T extends OwnableEntity = OwnableEntity> {
  entity: new (...args: any[]) => T;
  resourceType: Resource;
  customChecker?: new (...args: any[]) => OwnershipChecker;
}

@Module({})
export class AbacModule {
  static forRoot(): DynamicModule {
    return {
      module: AbacModule,
      global: true,
      providers: [OwnershipRegistry, AbacPolicyService],
      exports: [OwnershipRegistry, AbacPolicyService]
    };
  }

  /**
   * Register ownership checkers for the given entities.
   * Note: The module that calls this MUST also import TypeOrmModule.forFeature() for the same entities.
   */
  static forFeature(entities: OwnableEntityConfig[]): DynamicModule {
    const providers = AbacModule.createOwnershipProviders(entities);
    const exports = entities.map((config) =>
      getOwnershipCheckerToken(config.entity)
    );

    return {
      module: AbacModule,
      providers,
      exports
    };
  }

  /**
   * Create ownership checker providers for the given entities.
   * Use this if you want to add the providers directly to your module instead of using forFeature().
   */
  static createOwnershipProviders(entities: OwnableEntityConfig[]): Provider[] {
    const providers: Provider[] = [];

    for (const config of entities) {
      const token = getOwnershipCheckerToken(config.entity);

      if (config.customChecker) {
        providers.push({
          provide: token,
          useClass: config.customChecker
        });
      } else {
        providers.push({
          provide: token,
          useFactory: (repository: Repository<OwnableEntity>) => {
            return new GenericOwnershipService(config.resourceType, repository);
          },
          inject: [getRepositoryToken(config.entity)]
        });
      }

      providers.push({
        provide: `${token}_REGISTRAR`,
        useFactory: (
          registry: OwnershipRegistry,
          checker: OwnershipChecker
        ) => {
          registry.register(checker);
          return checker;
        },
        inject: [OwnershipRegistry, token]
      });
    }

    return providers;
  }
}
