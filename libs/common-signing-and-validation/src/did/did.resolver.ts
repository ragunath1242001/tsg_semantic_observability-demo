import { HttpStatus } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { DIDDocument } from "did-resolver";

import { DidKeyResolverStrategy } from "./key/did.key.resolver.strategy.js";
import { DidTdwResolverStrategy } from "./tdw/did.tdw.resolver.strategy.js";
import { DIDMethod } from "./types.js";
import { DidWebResolverStrategy } from "./web/did.web.resolver.strategy.js";

export interface DidResolverStrategy {
  resolve(didId: string): Promise<DIDDocument>;
}

// Map of DID methods to their resolver strategies
const resolverStrategies = new Map<string, DidResolverStrategy>([
  [DIDMethod.WEB, new DidWebResolverStrategy()],
  [DIDMethod.TDW, new DidTdwResolverStrategy()],
  [DIDMethod.KEY, new DidKeyResolverStrategy()]
]);

export async function resolveDid(didId: string): Promise<DIDDocument> {
  const prefix = `${didId.split(":").slice(0, 2).join(":")}:`;
  const didMethod = Array.from(resolverStrategies.keys()).find(
    (key) => key === prefix
  );
  const strategy = didMethod ? resolverStrategies.get(didMethod) : undefined;

  if (!strategy) {
    throw new AppError(
      `Resolver does not support the ${prefix} method`,
      HttpStatus.BAD_REQUEST
    );
  }

  return strategy.resolve(didId);
}
