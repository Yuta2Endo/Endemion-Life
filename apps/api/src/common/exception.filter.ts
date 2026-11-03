import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { toErrorResponse } from "./error-response.js";
import { requestContext } from "./logger.js";
import { captureError } from "./sentry.js";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("API");

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { status, body } = toErrorResponse(exception);
    if (status >= 500) {
      const requestId = requestContext.getStore()?.requestId;
      this.logger.error({ msg: "Необработанная ошибка", path: request.originalUrl.split("?")[0], error: exception });
      captureError(exception, requestId);
    }
    response.status(status).json(body);
  }
}
