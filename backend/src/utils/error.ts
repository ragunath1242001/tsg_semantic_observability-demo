/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus } from "@nestjs/common";
import axios from "axios";

export class AppError extends HttpException {
  err: unknown;
  constructor(message: string | Record<string, any>, status: HttpStatus, err: unknown = undefined, name: string = "AppError") {
    let response: Record<string, any>;
    if (typeof message === 'string') {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        message: message,
        error: (err) ? `${JSON.stringify(err)}` : undefined
      }
    } else {
      response = {
        name: name,
        status: HttpStatus[status],
        code: status,
        ...message,
        error: (err) ? `${JSON.stringify(err)}` : undefined
      }
    }
    super(response, status);
    this.err = err;
    this.name = name;
  }
}

export function parseNetworkError(err: unknown, task: string): AppError {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      return new AppError({
        message: `Error in ${task}: ${err}`,
        code: err.response.status,
        body: err.response.data
      }, HttpStatus.BAD_REQUEST);
    } else {
      return new AppError(`Error in ${task}: ${err}`, HttpStatus.BAD_REQUEST);
    }
  }
  return new AppError(`Unexpected error in ${task}: ${err}`, HttpStatus.BAD_REQUEST);

}