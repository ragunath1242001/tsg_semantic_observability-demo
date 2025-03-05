import {
  BASE_CONTEXT,
  CreateDIDInterface,
  DIDDoc,
  VerificationMethod
} from "@tsg-dsp/common-signing-and-validation";

export const createDate = (created?: Date) =>
  new Date(created ?? Date.now()).toISOString().slice(0, -5) + "Z";

export const createDIDDoc = async (
  options: CreateDIDInterface
): Promise<{ doc: DIDDoc }> => {
  const { controller } = options;
  const { all } = normalizeVMs(options.verificationMethods, controller);
  return {
    doc: {
      ...(options.context
        ? {
            "@context": Array.from(new Set([BASE_CONTEXT, ...options.context]))
          }
        : { "@context": [BASE_CONTEXT] }),
      id: controller,
      controller,
      ...all,
      service: options.service
    }
  };
};

export const normalizeVMs = (
  verificationMethod: VerificationMethod[] | undefined,
  did: string | null = null
) => {
  if (!verificationMethod) {
    return {};
  }
  const all: any = {};
  const nonKeyTypes = [
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityDelegation",
    "capabilityInvocation"
  ];
  const authentication = verificationMethod
    ?.filter((vm) => vm.type === "authentication")
    .map((vm) => vm.id);
  if (authentication && authentication?.length > 0) {
    all.authentication = authentication;
  }
  const assertionMethod = verificationMethod
    ?.filter((vm) => vm.type === "assertionMethod")
    .map((vm) => vm.id);
  if (assertionMethod && assertionMethod?.length > 0) {
    all.assertionMethod = assertionMethod;
  }
  const keyAgreement = verificationMethod
    ?.filter((vm) => vm.type === "keyAgreement")
    .map((vm) => vm.id);
  if (keyAgreement && keyAgreement?.length > 0) {
    all.keyAgreement = keyAgreement;
  }
  const capabilityDelegation = verificationMethod
    ?.filter((vm) => vm.type === "capabilityDelegation")
    .map((vm) => vm.id);
  if (capabilityDelegation && capabilityDelegation?.length > 0) {
    all.capabilityDelegation = capabilityDelegation;
  }
  const capabilityInvocation = verificationMethod
    ?.filter((vm) => vm.type === "capabilityInvocation")
    .map((vm) => vm.id);
  if (capabilityInvocation && capabilityInvocation?.length > 0) {
    all.capabilityInvocation = capabilityInvocation;
  }
  const realKeys = verificationMethod?.filter(
    (vm) => !nonKeyTypes.includes(vm.type)
  );
  if (realKeys && realKeys.length > 0) {
    all.verificationMethod = realKeys?.map((vm) => ({
      id: vm.id,
      ...(did ? { controller: vm.controller ?? did } : {}),
      type: vm.type,
      publicKeyMultibase: vm.publicKeyMultibase,
      publicKeyJwk: vm.publicKeyJwk
    }));
  }
  return { all };
};
