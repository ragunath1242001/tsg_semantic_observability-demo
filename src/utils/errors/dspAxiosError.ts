import axios from "axios";

export class DSPAxiosError extends Error {
  err: unknown;
  constructor(message: string, err: unknown) {
    super()
    let errorMessage;
    if (axios.isAxiosError(err)) {
      if (err.response) {
        errorMessage = `${message} (response): ${err.response.status} ${JSON.stringify(err.response.data)}`
      } else {
        errorMessage = `${message} (request): ${err.message}`
      }
    } else { 
      errorMessage = `${message} (unknown): ${err}`;
    }
    this.name = 'DSPAxiosError';
    this.message = errorMessage;
    this.err = err;
  }
}