import { HttpStatus } from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiResponseOptions
} from "@nestjs/swagger";

export class ErrorDto {
  @ApiProperty()
  name!: string;
  @ApiProperty()
  status!: string;
  @ApiProperty()
  code!: number;
  @ApiPropertyOptional()
  message?: string | Record<string, any>;
  @ApiPropertyOptional()
  error?: string;
}

export const ApiNotFoundResponseDefault = (options: ApiResponseOptions = {}) =>
  ApiResponse({
    description: "Resource not found",
    ...options,
    status: HttpStatus.NOT_FOUND,
    type: ErrorDto
  });

export const ApiConflictResponseDefault = (options: ApiResponseOptions = {}) =>
  ApiResponse({
    description: "Resource already exists",
    ...options,
    status: HttpStatus.CONFLICT,
    type: ErrorDto
  });

export const ApiForbiddenResponseDefault = (options: ApiResponseOptions = {}) =>
  ApiResponse({
    description: "Forbidden",
    ...options,
    status: HttpStatus.FORBIDDEN,
    type: ErrorDto
  });

export const ApiBadRequestResponseDefault = (
  options: ApiResponseOptions = {}
) =>
  ApiResponse({
    description: "Malformed request",
    ...options,
    status: HttpStatus.BAD_REQUEST,
    type: ErrorDto
  });
