import { DIDDocument } from "did-resolver";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DidWebResolverStrategy } from "./web/did.web.resolver.strategy.js";
import { DidTdwResolverStrategy } from "./tdw/did.tdw.resolver.strategy.js";
import { DIDMethod } from "../utils/did.js";
import { AppError } from "../utils/error.js";

export interface DidResolverStrategy {
  resolve(didId: string): Promise<DIDDocument>;
}

@Injectable()
export class DidResolverService {
  private readonly strategies: Map<string, DidResolverStrategy>;

  constructor() {
    this.strategies = new Map<string, DidResolverStrategy>([
      [DIDMethod.WEB, new DidWebResolverStrategy()],
      [DIDMethod.TDW, new DidTdwResolverStrategy()]
    ]);
  }

  async resolve(didId: string): Promise<DIDDocument> {
    const prefix = `${didId.split(":").slice(0, 2).join(":")}:`;
    const didMethod = Array.from(this.strategies.keys()).find(
      (key) => key === prefix
    );
    const strategy = didMethod ? this.strategies.get(didMethod) : undefined;
    if (!strategy) {
      throw new AppError(
        `Resolver does not support the ${prefix} method`,
        HttpStatus.BAD_REQUEST
      );
    }
    return strategy.resolve(didId);
  }
}
