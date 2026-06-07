import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import { App } from "../app";
import { ILogger } from "../utils/logger";
import { InMemoryCurrencyRepository } from "../currencies/currencyRepository";
import { PriceController } from "./priceController";
import { createPriceRouter } from "./priceRouter";
import { IPriceRepository, Price } from "./price.types";
import { createAuthMiddleware } from "../middlewares/authMiddleware";
import { config } from "../config";

describe("Price API (Integration & Unit)", () => {
  let appInstance: App;
  let repository: InMemoryCurrencyRepository;
  let mockPriceRepository: jest.Mocked<IPriceRepository>;

  const validToken = config.apiToken;

  const dummyPrices: Price[] = [
    { id: "p1", currencyId: "cur-1", symbol: "BTCUSDT", price: "75000.00" },
    { id: "p2", currencyId: "cur-1", symbol: "BTCEUR", price: "65000.00" },
    { id: "p3", currencyId: "cur-1", symbol: "ETHBTC", price: "0.027" },
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

    mockPriceRepository = {
      savePrices: jest.fn(),
      getPricesByTicker: jest.fn<() => Price[]>(),
    } as unknown as jest.Mocked<IPriceRepository>;

    const priceController = new PriceController({
      currencyRepository: repository,
      priceRepository: mockPriceRepository,
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
      expect(response.body.error).toContain("Missing Authorization header");
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

    it("должен успешно вернуть 200 и сохраненные торговые пары из локальной БД", async () => {
      repository.create({ name: "Bitcoin", ticker: "BTC" });

      mockPriceRepository.getPricesByTicker.mockReturnValue(dummyPrices);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "btc" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual(dummyPrices);
    });

    it("должен вернуть 200 и пустой массив, если в СУБД нет сохраненных цен для существующей валюты", async () => {
      repository.create({ name: "MyCoin", ticker: "MYCOIN" });

      mockPriceRepository.getPricesByTicker.mockReturnValue([]);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "MYCOIN" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("должен вернуть 500 Internal Server Error, если репозиторий выбросил ошибку чтения из БД", async () => {
      repository.create({ name: "Bitcoin", ticker: "BTC" });

      mockPriceRepository.getPricesByTicker.mockImplementation(() => {
        throw new Error("Сбой дисковой подсистемы СУБД");
      });

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC" });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Сбой дисковой подсистемы");
    });
  });
});
