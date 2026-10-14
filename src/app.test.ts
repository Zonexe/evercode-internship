import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { App } from "./app";
import { ILogger } from "./utils/logger";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { config } from "./config";
import express from "express";

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
    dummyRouter.get("/test", (req, res) => {
      res.json({ data: "success" });
    });

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
      priceRouter: express.Router(),
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

  describe("Global Auth Middleware Integration", () => {
    it("должен вернуть 403, если обращение к защищенному роуту происходит без токена", async () => {
      const response = await request(appInstance.expressApp).get(
        "/currencies/test",
      );
      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("должен пропустить запрос к защищенному роуту при наличии валидного токена", async () => {
      const response = await request(appInstance.expressApp)
        .get("/currencies/test")
        .set("Authorization", `Bearer ${config.apiToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: "success" });
    });
  });
});
