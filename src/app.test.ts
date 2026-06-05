import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { App } from "./app";
import { ILogger } from "./utils/logger";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { config } from "./config";
import express, { Router } from "express";

describe("App (Integration)", () => {
  let loggerMock: ILogger;
  let appInstance: App;

  beforeEach(() => {
    loggerMock = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const authMiddleware = createAuthMiddleware(config.apiToken);

    const dummyRouter = express.Router();
    const dummyErrorMiddleware: express.ErrorRequestHandler = (
      err,
      req,
      res,
      next,
    ) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    };

    appInstance = new App({
      logger: loggerMock,
      config: config,
      authMiddleware,
      currencyRouter: dummyRouter,
      priceRouter: dummyRouter,
      errorMiddleware: dummyErrorMiddleware,
    });
  });

  describe("GET /status (Public)", () => {
    it("should return status 200 and text 'ok' without authorization token", async () => {
      const response = await request(appInstance.expressApp).get("/status");
      expect(response.status).toBe(200);
      expect(response.text).toBe("ok");
    });
  });

  describe("GET /protected-route (Protected Zone)", () => {
    it("should return status 403 if authorization token is missing", async () => {
      const response = await request(appInstance.expressApp).get(
        "/protected-route",
      );
      expect(response.status).toBe(403);

      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("should return status 403 if token is invalid", async () => {
      const response = await request(appInstance.expressApp)
        .get("/protected-route")
        .set("Authorization", "Bearer invalid-token-sample");

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Invalid API token");
    });

    it("should return status 200 and secret data if token is valid", async () => {
      const response = await request(appInstance.expressApp)
        .get("/protected-route")
        .set("Authorization", `Bearer ${config.apiToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: "secret data" });
    });
  });
});
