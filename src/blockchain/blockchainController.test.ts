import express from "express";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { App } from "../app";
import { ILogger } from "../utils/logger";
import { createAuthMiddleware } from "../middlewares/authMiddleware";
import { IBlockcypherService } from "./blockcypher.types";
import { BlockchainController } from "./blockchainController";
import { createBlockchainRouter } from "./blockchainRouter";
import { config } from "../config";
import { AppError } from "../errors/AppError";

describe("Blockchain API (Integration)", () => {
  let appInstance: App;
  let mockBlockcypherService: jest.Mocked<IBlockcypherService>;
  const validToken = config.apiToken;

  beforeEach(() => {
    const loggerMock: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockBlockcypherService = {
      getBlockchainHeight: jest.fn<() => Promise<number>>(),
      getAddressBalance: jest.fn(),
    } as unknown as jest.Mocked<IBlockcypherService>;

    const blockchainController = new BlockchainController({
      blockcypherService: mockBlockcypherService,
      logger: loggerMock,
    });

    const blockchainRouter = createBlockchainRouter({ blockchainController });
    const authMiddleware = createAuthMiddleware(validToken);

    const dummyErrorMiddleware: express.ErrorRequestHandler = (
      err,
      req,
      res,
      next,
    ) => {
      res.status(err.statusCode || 500).json({
        error: err.message,
        ...(err.context ? { context: err.context } : {}),
      });
    };

    appInstance = new App({
      logger: loggerMock,
      config: config,
      authMiddleware,
      currencyRouter: express.Router(),
      priceRouter: express.Router(),
      addressRouter: express.Router(),
      blockchainRouter,
      errorMiddleware: dummyErrorMiddleware,
    });
  });

  describe("GET /blockchain/height", () => {
    it("должен вернуть 200 OK и текущую высоту блокчейна Биткоина при успешном запросе", async () => {
      mockBlockcypherService.getBlockchainHeight.mockResolvedValue(850000);

      const response = await request(appInstance.expressApp)
        .get("/blockchain/height")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ height: 850000 });
      expect(mockBlockcypherService.getBlockchainHeight).toHaveBeenCalledTimes(
        1,
      );
    });

    it("должен вернуть 403 Forbidden, если отсутствует заголовок авторизации", async () => {
      const response = await request(appInstance.expressApp).get(
        "/blockchain/height",
      );

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("должен вернуть 502 Bad Gateway, если внешний API Blockcypher недоступен", async () => {
      mockBlockcypherService.getBlockchainHeight.mockRejectedValue(
        new AppError(
          "Не удалось получить данные от Blockcypher API после 3 попыток",
          502,
        ),
      );

      const response = await request(appInstance.expressApp)
        .get("/blockchain/height")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(502);
      expect(response.body.error).toContain(
        "Не удалось получить данные от Blockcypher API",
      );
    });
  });
});
