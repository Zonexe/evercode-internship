import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import { App } from "../app";
import { ILogger } from "../utils/logger";
import { InMemoryCurrencyRepository } from "../currencies/currencyRepository";
import { PriceController } from "./priceController";
import { createPriceRouter } from "./priceRouter";
import { IBinanceService } from "./binance.types";
import { AppError } from "../errors/AppError";
import { createAuthMiddleware } from "../middlewares/authMiddleware";
import { config } from "../config";

describe("Price API (Integration & Unit)", () => {
  let appInstance: App;
  let repository: InMemoryCurrencyRepository;

  let mockBinanceService: jest.Mocked<IBinanceService>;

  const validToken = config.apiToken;

  const dummyBinancePrices = [
    { symbol: "BTCUSDT", price: "75000.00" },
    { symbol: "BTCEUR", price: "65000.00" },
    { symbol: "ETHUSDT", price: "2000.00" },
    { symbol: "ETHBTC", price: "0.027" },
  ];

  beforeEach(() => {
    const loggerMock: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    repository = new InMemoryCurrencyRepository();

    mockBinanceService = {
      getAllPrices: jest.fn<() => Promise<typeof dummyBinancePrices>>(),
    } as unknown as jest.Mocked<IBinanceService>;

    const priceController = new PriceController({
      currencyRepository: repository,
      binanceService: mockBinanceService,
      logger: loggerMock,
    });

    const priceRouter = createPriceRouter({ priceController });
    const authMiddleware = createAuthMiddleware(validToken);

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
      currencyRouter: express.Router(),
      priceRouter,
      errorMiddleware: dummyErrorMiddleware,
    });
  });

  describe("Проверка безопасности (Security)", () => {
    it("должен вернуть 403 Forbidden, если отсутствует заголовок Authorization", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price")
        .query({ currency: "BTC" });

      expect(response.status).toBe(403);
      expect(response.text).toContain("Missing Authorization header");
    });
  });

  describe("Валидация входящих параметров (Validation)", () => {
    it("должен вернуть 400 Bad Request, если параметр currency не передан", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("currency");
    });

    it("должен вернуть 400 Bad Request, если параметр currency пустой", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "   " });

      expect(response.status).toBe(400);
    });
  });

  describe("Бизнес-логика (Business Logic)", () => {
    it("должен вернуть 404 Not Found, если валюта отсутствует в нашей БД", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "DOGE" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("отсутствует в реестре");
    });

    it("должен успешно вернуть 200 и отфильтрованные пары, если валюта есть в БД и Binance ответил успешно", async () => {
      repository.create({ name: "Bitcoin", ticker: "BTC" });

      mockBinanceService.getAllPrices.mockResolvedValue(dummyBinancePrices);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "btc" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual([
        { symbol: "BTCUSDT", price: "75000.00" },
        { symbol: "BTCEUR", price: "65000.00" },
        { symbol: "ETHBTC", price: "0.027" },
      ]);
    });

    it("должен вернуть 200 и пустой массив, если для существующей валюты не нашлось пар на Binance", async () => {
      repository.create({ name: "MyCoin", ticker: "MYCOIN" });

      mockBinanceService.getAllPrices.mockResolvedValue(dummyBinancePrices);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "MYCOIN" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("должен вернуть 502 Bad Gateway, если внешний сервис BinanceHttpService выбросил сетевую ошибку", async () => {
      repository.create({ name: "Bitcoin", ticker: "BTC" });

      mockBinanceService.getAllPrices.mockRejectedValue(
        new AppError(
          "Не удалось получить данные от Binance API после нескольких попыток.",
          502,
        ),
      );

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC" });

      expect(response.status).toBe(502);
      expect(response.body.error).toContain(
        "Не удалось получить данные от Binance",
      );
    });
  });
});
