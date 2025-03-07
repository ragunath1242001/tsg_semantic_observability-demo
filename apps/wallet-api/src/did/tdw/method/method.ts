import {
  BASE_CONTEXT,
  clone,
  CreateDIDInterface,
  createSCID,
  DeactivateDIDInterface,
  deriveHash,
  DIDLog,
  DIDLogEntry,
  METHOD,
  newKeysAreValid,
  PLACEHOLDER,
  PROTOCOL,
  resolveDID,
  UpdateDIDInterface
} from "@tsg-dsp/common-signing-and-validation";
import jsonpatch from "fast-json-patch";

import { createDate, createDIDDoc, normalizeVMs } from "./utils.js";

export const createDID = async (
  options: CreateDIDInterface
): Promise<{ did: string; doc: any; meta: any; log: DIDLog }> => {
  if (!options.updateKeys) {
    throw new Error("Update keys not supplied");
  }
  newKeysAreValid(
    options.updateKeys,
    [],
    options.nextKeyHashes ?? [],
    false,
    options.prerotate === true
  );
  const controller = `did:${METHOD}:${options.domain}:${PLACEHOLDER}`;
  const createdDate = createDate(options.created);
  let { doc } = await createDIDDoc({ ...options, controller });
  const initialLogEntry: DIDLogEntry = [
    PLACEHOLDER,
    1,
    createdDate,
    {
      method: PROTOCOL,
      scid: PLACEHOLDER,
      updateKeys: options.updateKeys,
      ...(options.prerotate
        ? { prerotate: true, nextKeyHashes: options.nextKeyHashes }
        : {})
    },
    { value: doc }
  ];
  const initialLogEntryHash = deriveHash(initialLogEntry);
  const scid = await createSCID(initialLogEntryHash);
  doc = JSON.parse(JSON.stringify(doc).replaceAll(PLACEHOLDER, scid));

  initialLogEntry[0] = scid;
  initialLogEntry[3] = JSON.parse(
    JSON.stringify(initialLogEntry[3]).replaceAll(PLACEHOLDER, scid)
  );
  initialLogEntry[4] = { value: doc };

  const logEntryHash = deriveHash(initialLogEntry);
  initialLogEntry[0] = logEntryHash;
  const signedDoc = await options.signer(doc, logEntryHash);
  initialLogEntry.push([signedDoc.proof]);
  return {
    did: doc.id!,
    doc,
    meta: {
      versionId: 1,
      created: initialLogEntry[2],
      updated: initialLogEntry[2],
      ...(options.prerotate
        ? { prerotate: true, nextKeyHashes: options.nextKeyHashes }
        : {})
    },
    log: [initialLogEntry]
  };
};

export const updateDID = async (
  options: UpdateDIDInterface
): Promise<{ did: string; doc: any; meta: any; log: DIDLog }> => {
  const {
    log,
    updateKeys,
    context,
    verificationMethods,
    services,
    alsoKnownAs,
    controller,
    domain,
    nextKeyHashes,
    prerotate
  } = options;
  // eslint-disable-next-line prefer-const
  let { did, doc, meta } = await resolveDID(log);
  newKeysAreValid(
    updateKeys ?? [],
    meta.nextKeyHashes ?? [],
    nextKeyHashes ?? [],
    meta.prerotate === true,
    prerotate === true
  );

  if (domain) {
    did = `did:${METHOD}:${domain}:${log[0][3].scid}`;
  }
  const { all } = normalizeVMs(verificationMethods, did);
  const newDoc = {
    ...(context
      ? { "@context": Array.from(new Set([BASE_CONTEXT, ...context])) }
      : { "@context": [BASE_CONTEXT] }),
    id: did,
    ...(controller
      ? { controller: Array.from(new Set([did, ...controller])) }
      : { controller: [did] }),
    ...all,
    ...(services ? { service: services } : {}),
    ...(alsoKnownAs ? { alsoKnownAs } : {})
  };
  meta.versionId++;
  meta.updated = createDate(options.updated);
  const patch = jsonpatch.compare(doc, newDoc);
  const logEntry = [
    meta.previousLogEntryHash,
    meta.versionId,
    meta.updated,
    {
      ...(updateKeys ? { updateKeys } : {}),
      ...(prerotate ? { prerotate: true, nextKeyHashes } : {})
    },
    { patch: clone(patch) }
  ];
  const logEntryHash = deriveHash(logEntry);
  logEntry[0] = logEntryHash;
  const signedDoc = await options.signer(newDoc, logEntryHash);
  logEntry.push([signedDoc.proof]);
  return {
    did,
    doc: newDoc,
    meta: {
      versionId: meta.versionId,
      created: meta.created,
      updated: meta.updated,
      previousLogEntryHash: meta.previousLogEntryHash,
      ...(prerotate ? { prerotate: true, nextKeyHashes } : {})
    },
    log: [...clone(log), clone(logEntry)]
  };
};

export const deactivateDID = async (
  options: DeactivateDIDInterface
): Promise<{ did: string; doc: any; meta: any; log: DIDLog }> => {
  const { log } = options;
  const { did, doc, meta } = await resolveDID(log);
  const newDoc = {
    ...doc,
    authentication: [],
    assertionMethod: [],
    capabilityInvocation: [],
    capabilityDelegation: [],
    keyAgreement: [],
    verificationMethod: []
  };
  meta.versionId++;
  const patch = jsonpatch.compare(doc, newDoc);
  const logEntry = [
    meta.previousLogEntryHash,
    meta.versionId,
    meta.updated,
    { deactivated: true },
    { patch: clone(patch) }
  ];
  const logEntryHash = deriveHash(logEntry);
  logEntry[0] = logEntryHash;
  const signedDoc = await options.signer(newDoc, logEntryHash);
  logEntry.push([signedDoc.proof]);
  return {
    did,
    doc: newDoc,
    meta: {
      versionId: meta.versionId,
      created: meta.created,
      updated: meta.updated,
      previousLogEntryHash: meta.previousLogEntryHash,
      deactivated: true
    },
    log: [...clone(log), clone(logEntry)]
  };
};
