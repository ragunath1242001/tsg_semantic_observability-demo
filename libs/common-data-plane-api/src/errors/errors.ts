import { HttpStatus } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import axios from "axios";

/**
 * Standard error class for data plane errors
 */
export class DataPlaneError extends AppError {
  constructor(message: string | Record<string, unknown>, status: HttpStatus);
  constructor(
    message: string | Record<string, unknown>,
    status: HttpStatus,
    err: unknown
  );
  constructor(
    message: string | Record<string, unknown>,
    status: HttpStatus,
    name = "DataPlaneError",
    err?: unknown
  ) {
    super(message, status, err, name);
  }
}

/**
 * Standard error class for data plane client errors
 */
export class DataPlaneClientError extends AppError {
  declare err: unknown;
  constructor(message: string, err: unknown) {
    let errorMessage: string;
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

    super(errorMessage, status, err, "DataPlaneClientError");
  }
}
