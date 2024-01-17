/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus } from "@nestjs/common";
import axios from "axios";

export class DSPError extends HttpException {
  err: unknown;
  constructor(message: string | Record<string, any>, status: HttpStatus)
  constructor(message: string | Record<string, any>, status: HttpStatus, err: unknown)
  constructor(message: string | Record<string, any>, status: HttpStatus, name = "DSPError", err?: unknown) {
    let response: Record<string, any>;
    if (typeof message === 'string') {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        message: message,
        error: (err) ? `${err}` : undefined
      }
    } else {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        ...message,
        error: (err) ? `${err}` : undefined
      }
    }
    super(response, status);
    this.err = err;
    this.name = name;
  }
}

export class DSPClientError extends DSPError {
  err: unknown;
  constructor(message: string, err: unknown) {
    let errorMessage;
    let status: HttpStatus;
    if (axios.isAxiosError(err)) {
      if (err.response) {
        errorMessage = `${message} (response): ${err.response.status} ${JSON.stringify(err.response.data)}`
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
