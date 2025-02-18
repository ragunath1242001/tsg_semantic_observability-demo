/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import axios from "axios";

export class DSPError extends AppError {
  constructor(message: string | Record<string, any>, status: HttpStatus);
  constructor(
    message: string | Record<string, any>,
    status: HttpStatus,
    err: unknown
  );
  constructor(
    message: string | Record<string, any>,
    status: HttpStatus,
    name: string = "DSPError",
    err?: unknown
  ) {
    super(message, status, err, name);
  }
}

export class DSPClientError extends AppError {
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

    super(errorMessage, status, err, "DSPClientError");
  }
}
