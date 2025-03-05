import axios from "axios";
import { DIDDocument } from "did-resolver";
import { AppError } from "@tsg-dsp/common-api";
import { HttpStatus, Logger } from "@nestjs/common";
import { DidResolverStrategy } from "../did.resolver.js";
import { DIDLog } from "./method/interfaces.js";
import jsonpatch from "fast-json-patch";
import { PLACEHOLDER, PROTOCOL } from "./constants.js";
import { documentStateIsValid, newKeysAreValid } from "./method/assertions.js";
import { clone, createSCID, deriveHash } from "./method/utils.js";

export const resolveDID = async (
  log: DIDLog,
  options: { versionId?: number; versionTime?: Date } = {}
): Promise<{ did: string; doc: any; meta: any }> => {
  // clone log to avoid mutation
  const resolutionLog = clone(log);
  const protocol = resolutionLog[0][3].method;
  if (protocol !== PROTOCOL) {
    throw new Error(`'${protocol}' protocol unknown.`);
  }
  let versionId = 0;
  let doc: any = {};
  let did = "";
  let scid = "";
  let created = "";
  let updated = "";
  let updateKeys = [];
  let previousLogEntryHash = "";
  let i = 0;
  let deactivated: boolean | null = null;
  let prerotate = false;
  let nextKeyHashes: string[] = [];
  for (const entry of resolutionLog) {
    if (entry[1] !== versionId + 1) {
      throw new Error(
        `versionId '${entry[1]}' in log doesn't match expected '${versionId}'.`
      );
    }
    versionId = entry[1];
    if (updated != "") {
      if (new Date(entry[2]) < new Date(updated)) {
        throw new Error(
          `versionTime '${entry[2]}' in log is before previous versionTime '${updated}'.`
        );
      }
    }
    updated = entry[2];

    // doc patches & proof
    let newDoc;
    if (versionId === 1) {
      created = entry[2];
      newDoc = entry[4].value;
      scid = entry[3].scid;
      updateKeys = entry[3].updateKeys;
      prerotate = entry[3].prerotate === true;
      nextKeyHashes = entry[3].nextKeyHashes ?? [];
      newKeysAreValid(updateKeys, [], nextKeyHashes, false, prerotate === true);
      const initialLogEntry = deriveHash([
        PLACEHOLDER,
        1,
        created,
        JSON.parse(JSON.stringify(entry[3]).replaceAll(scid, PLACEHOLDER)),
        {
          value: JSON.parse(
            JSON.stringify(newDoc).replaceAll(scid, PLACEHOLDER)
          )
        }
      ]);
      const derivedScid = await createSCID(initialLogEntry);
      if (scid !== derivedScid) {
        throw new Error(
          `SCID '${scid}' not derived from initialLogEntry '${initialLogEntry}' (scid ${derivedScid})`
        );
      }
      const logEntryHash = deriveHash([
        derivedScid,
        entry[1],
        entry[2],
        entry[3],
        entry[4]
      ]);
      previousLogEntryHash = logEntryHash;
      if (logEntryHash !== entry[0]) {
        throw new Error(`Hash chain broken at '${versionId}'`);
      }
      const verified = await documentStateIsValid(newDoc, entry[5], updateKeys);
      if (!verified) {
        throw new Error(
          `version ${versionId} failed verification of the proof.`
        );
      }
    } else {
      // versionId > 1
      if (Object.keys(entry[4]).some((k: string) => k === "value")) {
        newDoc = entry[4].value;
      } else {
        newDoc = jsonpatch.applyPatch(
          doc,
          entry[4].patch,
          false,
          false
        ).newDocument;
      }
      if (
        entry[3].prerotate === true &&
        (!entry[3].nextKeyHashes || entry[3].nextKeyHashes.length === 0)
      ) {
        throw new Error("prerotate enabled without nextKeyHashes");
      }
      newKeysAreValid(
        entry[3].updateKeys ?? [],
        nextKeyHashes,
        entry[3].nextKeyHashes ?? [],
        prerotate,
        entry[3].prerotate === true
      );
      const logEntryHash = deriveHash([
        previousLogEntryHash,
        entry[1],
        entry[2],
        entry[3],
        entry[4]
      ]);
      previousLogEntryHash = logEntryHash;
      if (logEntryHash !== entry[0]) {
        throw new Error(`Hash chain broken at '${versionId}'`);
      }
      const verified = await documentStateIsValid(newDoc, entry[5], updateKeys);
      if (!verified) {
        throw new Error(
          `version ${versionId} failed verification of the proof.`
        );
      }
      if (entry[3].updateKeys) {
        updateKeys = entry[3].updateKeys;
      }
      if (entry[3].deactivated === true) {
        deactivated = true;
      }
      if (entry[3].prerotate === true) {
        prerotate = true;
      }
      if (entry[3].nextKeyHashes) {
        nextKeyHashes = entry[3].nextKeyHashes;
      }
    }
    doc = clone(newDoc);
    did = doc.id;
    if (options.versionId === versionId) {
      return {
        did,
        doc,
        meta: { versionId, created, updated, previousLogEntryHash, scid }
      };
    }
    if (options.versionTime && options.versionTime > new Date(updated)) {
      if (
        resolutionLog[i + 1] &&
        options.versionTime < new Date(resolutionLog[i + 1][2])
      ) {
        return {
          did,
          doc,
          meta: { versionId, created, updated, previousLogEntryHash, scid }
        };
      } else if (!resolutionLog[i + 1]) {
        return {
          did,
          doc,
          meta: { versionId, created, updated, previousLogEntryHash, scid }
        };
      }
    }
    i++;
  }
  if (options.versionTime || options.versionId) {
    throw new Error(`DID with options ${JSON.stringify(options)} not found`);
  }
  return {
    did,
    doc,
    meta: {
      versionId,
      created,
      updated,
      previousLogEntryHash,
      scid,
      prerotate,
      nextKeyHashes,
      ...(deactivated ? { deactivated } : {})
    }
  };
};

export class DidTdwResolverStrategy implements DidResolverStrategy {
  private readonly logger = new Logger(this.constructor.name);

  async resolve(didId: string): Promise<DIDDocument> {
    let [host, ...paths] = didId.slice(8).split(":");
    host = decodeURIComponent(host);
    paths = paths.map((path) => decodeURIComponent(path));
    let url: string;
    const protocol = host.startsWith("localhost") ? "http" : "https";
    if (paths.length === 0) {
      url = `${protocol}://${host}/.well-known/did.jsonl`;
    } else {
      url = `${protocol}://${host}/${paths.join("/")}/did.jsonl`;
    }
    try {
      const response = await axios.get<string>(url);
      let rawLogResponse = response.data;
      if (typeof response.data === "object") {
        rawLogResponse = JSON.stringify(response.data);
      }
      const didLog: DIDLog = rawLogResponse
        .trim()
        .split("\n")
        .map((logEntry) => JSON.parse(logEntry));
      const { doc } = await resolveDID(didLog);
      return doc;
    } catch (_) {
      throw new AppError(
        `Could not load DID document for ${didId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }
}
