import { ErrorRequestHandler } from "express";
import { ILogger } from "../utils/logger";

interface HttpCompatibleError {
  statusCode: number;
  message: string;
  context?: Record<string, unknown>;
}

function isHttpCompatibleError(error: unknown): error is HttpCompatibleError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as Record<string, unknown>).statusCode === "number" &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

export function createErrorMiddleware(logger: ILogger): ErrorRequestHandler {
  return (err, req, res, next) => {
    const hasHttpContext = isHttpCompatibleError(err);

    const statusCode = hasHttpContext ? err.statusCode : 500;
    const message = hasHttpContext ? err.message : "Internal Server Error";
    const context = hasHttpContext ? err.context : undefined;

    if (statusCode >= 500) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      logger.error(`[5xx Unhandled Error] ${errorMsg}`, {
        context: {
          statusCode,
          context,
          stack: err instanceof Error ? err.stack : undefined,
        },
      });
    } else {
      logger.warn(`[4xx Client Error] ${message}`, {
        context: { statusCode, context },
      });
    }

    res.status(statusCode).json({
      error: message,
      ...(context ? { context } : {}),
    });
  };
}
