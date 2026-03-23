import { Injectable } from "@nestjs/common";
import {
  Resource,
  ResourceAttributes,
  SubjectAttributes
} from "@tsg-dsp/common-dtos";
import { Repository } from "typeorm";

import { OwnableEntity, OWNERSHIP_FIELDS } from "../../model/ownable.entity.js";

export interface OwnershipChecker {
  readonly resourceType: Resource;
  isOwner(resourceId: string, subject: SubjectAttributes): Promise<boolean>;
  getResourceAttributes(resourceId: string): Promise<ResourceAttributes | null>;
  getOwnedResourceIds?(subject: SubjectAttributes): Promise<string[]>;
}

@Injectable()
export class GenericOwnershipService<
  T extends OwnableEntity
> implements OwnershipChecker {
  constructor(
    readonly resourceType: Resource,
    private readonly repository: Repository<T>
  ) {}

  async isOwner(
    resourceId: string,
    subject: SubjectAttributes
  ): Promise<boolean> {
    const entity = await this.repository.findOne({
      where: { id: resourceId } as any
    });

    if (!entity) return false;

    if (entity.ownerId && entity.ownerId === subject.sub) return true;

    if (entity.ownerIdentifier) {
      if (subject.didId && entity.ownerIdentifier === subject.didId)
        return true;
    }

    return false;
  }

  async getResourceAttributes(
    resourceId: string
  ): Promise<ResourceAttributes | null> {
    const entity = await this.repository.findOne({
      where: { id: resourceId } as any
    });

    if (!entity) return null;

    return {
      type: this.resourceType,
      id: resourceId,
      ownerId: entity.ownerId,
      ownerIdentifier: entity.ownerIdentifier,
      tenantId: entity.tenantId
    };
  }

  async getOwnedResourceIds(subject: SubjectAttributes): Promise<string[]> {
    const qb = this.repository.createQueryBuilder("e");
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (subject.sub) {
      conditions.push(`e.${OWNERSHIP_FIELDS.OWNER_ID} = :sub`);
      params.sub = subject.sub;
    }
    if (subject.didId) {
      conditions.push(`e.${OWNERSHIP_FIELDS.OWNER_IDENTIFIER} = :didId`);
      params.didId = subject.didId;
    }

    if (conditions.length === 0) return [];

    const results = await qb
      .where(conditions.join(" OR "), params)
      .select(`e.${OWNERSHIP_FIELDS.ID}`, "id")
      .getRawMany();

    return results.map((r) => r.id);
  }
}

@Injectable()
export class OwnershipRegistry {
  private checkers = new Map<Resource, OwnershipChecker>();

  register(checker: OwnershipChecker): void {
    this.checkers.set(checker.resourceType, checker);
  }

  get(resourceType: Resource): OwnershipChecker | undefined {
    return this.checkers.get(resourceType);
  }

  async isOwner(
    resourceType: Resource,
    resourceId: string,
    subject: SubjectAttributes
  ): Promise<boolean> {
    const checker = this.checkers.get(resourceType);
    return checker ? checker.isOwner(resourceId, subject) : false;
  }

  async getResourceAttributes(
    resourceType: Resource,
    resourceId: string
  ): Promise<ResourceAttributes | null> {
    const checker = this.checkers.get(resourceType);
    return checker
      ? checker.getResourceAttributes(resourceId)
      : { type: resourceType, id: resourceId };
  }
}
