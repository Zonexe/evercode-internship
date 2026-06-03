import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import { createAuthMiddleware } from "./authMiddleware";

describe("authMiddleware (Unit)", () => {
  const mockApiToken =
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  let middleware: ReturnType<typeof createAuthMiddleware>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = createAuthMiddleware(mockApiToken);

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };

    nextFunction = jest.fn();
  });

  it("should call next() if authorization header is valid", () => {
    mockRequest.headers = {
      authorization: `Bearer ${mockApiToken}`,
    };

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it("should return 403 if authorization header is completely missing", () => {
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Missing Authorization header"),
    });
  });

  it("should return 403 if format is invalid (not Bearer)", () => {
    mockRequest.headers = {
      authorization: `Basic ${mockApiToken}`,
    };

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Invalid Authorization header format"),
    });
  });

  it("should return 403 if token is incorrect", () => {
    mockRequest.headers = {
      authorization: "Bearer wrong-token-value-here-123",
    };

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Invalid API token"),
    });
  });

  it("should return 403 if token is empty after Bearer prefix", () => {
    mockRequest.headers = {
      authorization: "Bearer ",
    };

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Invalid Authorization header format"),
    });
  });
});
