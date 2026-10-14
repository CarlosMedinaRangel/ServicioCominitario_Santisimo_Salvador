import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: (exception as any)?.message || 'Internal Server Error' };

    const errorMessage =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || JSON.stringify(exceptionResponse)
        : exceptionResponse;

    const formattedReason = Array.isArray(errorMessage)
      ? errorMessage.join(' | ')
      : errorMessage;

    if (status >= 500) {
      console.error(
        `\x1b[31m[ERROR 500] 💥 ${request.method} ${request.originalUrl} - Reason: ${formattedReason}\x1b[0m`,
      );
      if (exception instanceof Error && exception.stack) {
        console.error(`\x1b[90m${exception.stack}\x1b[0m`);
      }
    } else {
      console.warn(
        `\x1b[33m[REJECTED ${status}] ⚠️  ${request.method} ${request.originalUrl} - Reason: ${formattedReason}\x1b[0m`,
      );
    }

    const payload =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? {
            ...exceptionResponse,
            timestamp: new Date().toISOString(),
            path: request.originalUrl || request.url,
          }
        : {
            statusCode: status,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            path: request.originalUrl || request.url,
          };

    response.status(status).json(payload);
  }
}
