import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { DatabaseSync } from "node:sqlite";
import request from "supertest";
import express from "express";
import { App } from "../app";
import { ILogger } from "../utils/logger";
import { createDatabase } from "../db/database";
import { SqliteCurrencyRepository } from "../currencies/sqliteCurrencyRepository";
import { PriceController } from "./priceController";
import { createPriceRouter } from "./priceRouter";
import { IPriceRepository, Price } from "./price.types";
import { createAuthMiddleware } from "../middlewares/authMiddleware";
import { config } from "../config";

describe("Price API (Integration & Unit)", () => {
  let appInstance: App;
  let testDb: DatabaseSync;
  let repository: SqliteCurrencyRepository;
  let mockPriceRepository: jest.Mocked<IPriceRepository>;

  const validToken = config.apiToken;

  const dummyPrices: Price[] = [
    {
      id: "p1",
      currencyId: "cur-1",
      price: "75000.00",
      recordedAt: "2026-10-07T10:00:00.000Z",
    },
    {
      id: "p2",
      currencyId: "cur-1",
      price: "76000.00",
      recordedAt: "2026-10-07T11:00:00.000Z",
    },
    {
      id: "p3",
      currencyId: "cur-1",
      price: "75500.00",
      recordedAt: "2026-10-07T12:00:00.000Z",
    },
  ];

  beforeEach(() => {
    const loggerMock: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    testDb = createDatabase(":memory:");
    repository = new SqliteCurrencyRepository({ database: testDb });

    mockPriceRepository = {
      savePrice: jest.fn(),
      getLatestPrice: jest.fn(),
      getHistoryByTicker: jest.fn(),
    };

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
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    };

    appInstance = new App({
      logger: loggerMock,
      config,
      authMiddleware,
      currencyRouter: express.Router(),
      priceRouter,
      errorMiddleware: dummyErrorMiddleware,
    });
  });

  afterEach(() => {
    testDb.close();
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

  describe("GET /price - Валидация входящих параметров (Validation)", () => {
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

    it("должен вернуть 400 Bad Request, если параметр limit не является положительным числом", async () => {
      repository.create({ name: "Bitcoin", ticker: "BTC" });

      const responseNegative = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC", limit: "-5" });

      expect(responseNegative.status).toBe(400);
      expect(responseNegative.body.error).toContain("limit");

      const responseNaN = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC", limit: "invalid" });

      expect(responseNaN.status).toBe(400);
      expect(responseNaN.body.error).toContain("limit");
    });
  });

  describe("GET /price - Бизнес-логика (Business Logic)", () => {
    it("должен вернуть 404 Not Found, если валюта отсутствует в нашей БД", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "DOGE" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("отсутствует в реестре");

      expect(mockPriceRepository.getHistoryByTicker).not.toHaveBeenCalled();
    });

    it("должен успешно вернуть 200 и историю цен существующей криптовалюты", async () => {
      repository.create({
        name: "Bitcoin",
        ticker: "BTC",
      });

      mockPriceRepository.getHistoryByTicker.mockReturnValue(dummyPrices);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "btc" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual(dummyPrices);

      expect(mockPriceRepository.getHistoryByTicker).toHaveBeenCalledTimes(1);
      expect(mockPriceRepository.getHistoryByTicker).toHaveBeenCalledWith(
        "BTC",
        undefined,
      );
    });

    it("должен корректно передавать валидный параметр limit в репозиторий", async () => {
      repository.create({
        name: "Bitcoin",
        ticker: "BTC",
      });

      mockPriceRepository.getHistoryByTicker.mockReturnValue([dummyPrices[0]]);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC", limit: "1" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(mockPriceRepository.getHistoryByTicker).toHaveBeenCalledWith(
        "BTC",
        1,
      );
    });

    it("должен вернуть 200 и пустой массив, если в БД нет истории цен", async () => {
      repository.create({
        name: "MyCoin",
        ticker: "MYCOIN",
      });

      mockPriceRepository.getHistoryByTicker.mockReturnValue([]);

      const response = await request(appInstance.expressApp)
        .get("/price")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "MYCOIN" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      expect(mockPriceRepository.getHistoryByTicker).toHaveBeenCalledWith(
        "MYCOIN",
        undefined,
      );
    });

    it("должен вернуть 500 Internal Server Error, если репозиторий выбросил ошибку чтения из БД", async () => {
      repository.create({
        name: "Bitcoin",
        ticker: "BTC",
      });

      mockPriceRepository.getHistoryByTicker.mockImplementation(() => {
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

  describe("GET /price/latest - Текущая цена", () => {
    it("должен вернуть 400 Bad Request, если параметр currency не передан", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price/latest")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("currency");
    });

    it("должен вернуть 404 Not Found, если валюта отсутствует в БД", async () => {
      const response = await request(appInstance.expressApp)
        .get("/price/latest")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "UNKNOWN" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("отсутствует в реестре");
    });

    it("должен вернуть 404, если цена для валюты еще не синхронизирована", async () => {
      const created = repository.create({ name: "Bitcoin", ticker: "BTC" });
      mockPriceRepository.getLatestPrice.mockReturnValue(undefined);

      const response = await request(appInstance.expressApp)
        .get("/price/latest")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("пока нет сохраненных цен");
    });

    it("должен вернуть 200 и объект цены при успешном запросе", async () => {
      const currency = repository.create({ name: "Bitcoin", ticker: "BTC" });
      mockPriceRepository.getLatestPrice.mockReturnValue(dummyPrices[1]);

      const response = await request(appInstance.expressApp)
        .get("/price/latest")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ currency: "BTC" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(dummyPrices[1]);

      expect(mockPriceRepository.getLatestPrice).toHaveBeenCalledTimes(1);
      expect(mockPriceRepository.getLatestPrice).toHaveBeenCalledWith(
        currency.id,
      );
    });
  });
});
