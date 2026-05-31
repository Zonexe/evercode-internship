import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { createErrorMiddleware } from "./errorMiddleware";
import { ILogger } from "../utils/logger";
import { AppError } from "../errors/AppError";

describe("errorMiddleware (Unit)", () => {
  let loggerMock: jest.Mocked<ILogger>;
  let middleware: ReturnType<typeof createErrorMiddleware>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    loggerMock = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    middleware = createErrorMiddleware(loggerMock);

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    nextFunction = jest.fn();
  });

  it("должен вернуть 500 и 'Internal Server Error' для обычных непредвиденных ошибок", () => {
    const unexpectedError = new Error("Сбой базы данных");

    middleware(
      unexpectedError,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });

    expect(loggerMock.error).toHaveBeenCalled();
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it("должен вернуть статус-код и контекст для кастомных ошибок, совместимых с HttpCompatibleError", () => {
    const apiError = new AppError("Некорректные параметры запроса", 400, {
      invalidField: "ticker",
    });

    middleware(
      apiError,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Некорректные параметры запроса",
      context: { invalidField: "ticker" },
    });

    expect(loggerMock.warn).toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });
});
