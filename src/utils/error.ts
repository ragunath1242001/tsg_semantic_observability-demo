import { HttpException, HttpStatus } from "@nestjs/common";

export class AppError extends HttpException {
  err: unknown;
  constructor(message: string | Record<string, any>, status: HttpStatus)
  constructor(message: string | Record<string, any>, status: HttpStatus, err: unknown)
  constructor(message: string | Record<string, any>, status: HttpStatus, name = "AppError", err?: unknown) {
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