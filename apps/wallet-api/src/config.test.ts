import { describe, expect, it } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "./config.js";
import { AppError } from "@tsg-dsp/common-api";
import { HttpStatus } from "@nestjs/common";
import { toArray } from "@tsg-dsp/common-dsp";

describe("Config", () => {
  it("Test complete config", () => {
    plainToInstance(RootConfig, {
      db: {
        type: "sqlite",
        database: "test"
      },
      server: {
        listen: "0.0.0.0",
        port: 3000,
        publicDomain: "localhost",
        publicAddress: "http://localhost:3000"
      },
      initClients: [
        {
          id: "test",
          secret: "test",
          email: "test@test.com",
          didId: "did:web:test.com",
          roles: ["view_did", "manage_keys", "view_own_credentials"]
        }
      ],
      initKeys: [
        {
          type: "EdDSA",
          id: "key-0",
          default: true
        },
        {
          type: "X509",
          id: "key-1",
          default: false,
          existingKey: "file:package.json",
          existingCertificate: "existing-certificate"
        },
        {
          type: "X509",
          id: "key-2",
          default: false,
          existingKey: "file:unknown-file",
          existingCertificate: {}
        }
      ],
      initCredentials: [
        {
          context: ["https://example.com/context.json"],
          type: ["ExampleCredentialType"],
          id: `did:web:localhost#test-init-credential`,
          keyId: "key-0",
          credentialSubject: {
            id: "did:web:localhost"
          }
        }
      ],
      trustAnchors: [
        {
          identifier: "did:web:localhost",
          credentialTypes: ["VerifiableCredential", "ExampleCredentialType"]
        }
      ],
      contexts: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          issuable: true,
          documentUrl: "https://example.com/context.json"
        }
      ]
    });
  });
  it("Test postgres config", () => {
    plainToInstance(RootConfig, {
      db: {
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "username",
        password: "password"
      }
    });
  });
  it("Test unions", () => {
    expect(toArray<string>(undefined)).toEqual([]);
    expect(toArray("test")).toEqual(["test"]);
    expect(toArray(["test"])).toEqual(["test"]);
  });
  it("Test errors", () => {
    const textError = new AppError("Error", HttpStatus.INTERNAL_SERVER_ERROR);
    expect(textError.getResponse()).toEqual({
      message: "Error",
      name: "AppError",
      code: 500,
      status: "INTERNAL_SERVER_ERROR"
    });
    const textErrorWithCause = new AppError(
      "Error",
      HttpStatus.INTERNAL_SERVER_ERROR,
      { previousError: "error" }
    );
    expect(textErrorWithCause.getResponse()).toEqual({
      message: "Error",
      name: "AppError",
      code: 500,
      status: "INTERNAL_SERVER_ERROR",
      error: `${JSON.stringify({ previousError: "error" })}`
    });
    const recordError = new AppError(
      { "exception-info": "error" },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(recordError.getResponse()).toEqual({
      "exception-info": "error",
      name: "AppError",
      code: 500,
      status: "INTERNAL_SERVER_ERROR"
    });
    const recordErrorWithCause = new AppError(
      { "exception-info": "error" },
      HttpStatus.INTERNAL_SERVER_ERROR,
      { previousError: "error" }
    );
    expect(recordErrorWithCause.getResponse()).toEqual({
      "exception-info": "error",
      name: "AppError",
      code: 500,
      status: "INTERNAL_SERVER_ERROR",
      error: `${JSON.stringify({ previousError: "error" })}`
    });
    const modifiedNameError = new AppError(
      "Error",
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      "CustomErrorName"
    );
    expect(modifiedNameError.getResponse()).toEqual({
      message: "Error",
      name: "CustomErrorName",
      code: 500,
      status: "INTERNAL_SERVER_ERROR"
    });
  });
});
