/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import axios from "axios";

export class AppError extends HttpException {
  err: unknown;
  appResponse: Record<string, any>;
  constructor(
    message: string | Record<string, any>,
    status: HttpStatus,
    err: unknown = undefined,
    name: string = "AppError"
  ) {
    let response: Record<string, any>;
    if (typeof message === "string") {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        message: message,
        error: err ? `${JSON.stringify(err)}` : undefined
      };
    } else {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        ...message,
        error: err ? `${JSON.stringify(err)}` : undefined
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
  ): AppError {
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

export function parseNetworkError(
  err: unknown,
  task: string,
  status: number = HttpStatus.BAD_REQUEST
): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (axios.isAxiosError(err)) {
    if (err.response) {
      return new AppError(
        {
          message: `Error in ${task}: ${err}`,
          code: err.response.status,
          body: err.response.data
        },
        status
      ).andLog(new Logger("Axios"));
    } else {
      return new AppError(`Error in ${task}: ${err}`, status).andLog(
        new Logger("Axios")
      );
    }
  }
  return new AppError(`Unexpected error in ${task}: ${err}`, status).andLog(
    new Logger("Axios")
  );
}
