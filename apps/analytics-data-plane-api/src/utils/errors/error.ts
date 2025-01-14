/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import axios from "axios";

export class DataPlaneError extends HttpException {
  err: unknown;
  appResponse: Record<string, any>;
  constructor(message: string | Record<string, any>, status: HttpStatus);
  constructor(
    message: string | Record<string, any>,
    status: HttpStatus,
    err: unknown
  );
  constructor(
    message: string | Record<string, any>,
    status: HttpStatus,
    name = "DataPlaneError",
    err?: unknown
  ) {
    let response: Record<string, any>;
    if (typeof message === "string") {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        message: message,
        error: err ? `${err}` : undefined
      };
    } else {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        ...message,
        error: err ? `${err}` : undefined
      };
    }
    super(response, status);
    this.err = err;
    this.name = name;
    this.appResponse = response;
  }

  andLog(
    logger: Logger,
    level: "fatal" | "error" | "warn" | "log" | "debug" | "verbose" = "warn",
    full = false
  ): DataPlaneError {
    if (full) {
      logger[level](`App Error\n:${JSON.stringify(this.appResponse, null, 2)}`);
    } else {
      logger[level](
        `App Error: ${this.appResponse["code"]} ${this.appResponse["message"]}`
      );
    }
    return this;
  }
}

export class DataPlaneClientError extends DataPlaneError {
  declare err: unknown;
  constructor(message: string, err: unknown) {
    let errorMessage;
    let status: HttpStatus;
    if (axios.isAxiosError(err)) {
      if (err.response) {
        errorMessage = `${message} (response): ${
          err.response.status
        } ${JSON.stringify(err.response.data)}`;
        status = err.response.status;
      } else {
        errorMessage = `${message} (request): ${err.message}`;
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    } else {
      errorMessage = `${message} (unknown): ${err}`;
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    super(errorMessage, status, err);
  }
}
