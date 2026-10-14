import express from "express";
import { DatabaseSync } from "node:sqlite";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import request from "supertest";
import { App } from "../app";
import { ILogger } from "../utils/logger";
import { createAuthMiddleware } from "../middlewares/authMiddleware";
import { createDatabase } from "../db/database";
import { SqliteCurrencyRepository } from "./sqliteCurrencyRepository";
import { CurrencyController } from "./currencyController";
import { createCurrencyRouter } from "./currencyRouter";
import { config } from "../config";

describe("Currency API (Integration)", () => {
  let appInstance: App;
  let testDb: DatabaseSync;
  let repository: SqliteCurrencyRepository;
  const validToken = config.apiToken;

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

    const currencyController = new CurrencyController({
      currencyRepository: repository,
    });
    const currencyRouter = createCurrencyRouter({ currencyController });

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
      currencyRouter,
      priceRouter: express.Router(),
      errorMiddleware: dummyErrorMiddleware,
    });
  });

  afterEach(() => {
    testDb.close();
  });

  describe("Проверка авторизации (Security)", () => {
    it("должен вернуть 403 Forbidden, если токен авторизации отсутствует", async () => {
      const response = await request(appInstance.expressApp).get("/currencies");

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("должен вернуть 403 Forbidden, если передан невалидный токен", async () => {
      const response = await request(appInstance.expressApp)
        .get("/currencies")
        .set("Authorization", "Bearer invalid_token_value");

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Invalid API token");
    });
  });

  describe("POST /currencies (Создание)", () => {
    it("должен успешно создать валюту и вернуть 201 с созданными данными", async () => {
      const response = await request(appInstance.expressApp)
        .post("/currencies")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ name: "Bitcoin", ticker: "BTC" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Bitcoin");
      expect(response.body.ticker).toBe("BTC");
    });

    it("должен вернуть 400 Bad Request, если поле 'name' пропущено", async () => {
      const response = await request(appInstance.expressApp)
        .post("/currencies")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ ticker: "BTC" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("name");
    });

    it("должен вернуть 400 Bad Request, если поле 'ticker' пустое", async () => {
      const response = await request(appInstance.expressApp)
        .post("/currencies")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ name: "Bitcoin", ticker: "   " });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("ticker");
    });

    it("должен вернуть 409 Conflict, если валюта с таким тикером уже существует", async () => {
      repository.create({ name: "US Dollar", ticker: "USD" });

      const response = await request(appInstance.expressApp)
        .post("/currencies")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ name: "United States Dollar", ticker: "usd" });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("уже существует");
    });
  });

  describe("GET /currencies (Получение списка)", () => {
    it("должен вернуть пустой массив 200 OK, если в хранилище нет данных", async () => {
      const response = await request(appInstance.expressApp)
        .get("/currencies")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("должен вернуть список всех валют из репозитория, отсортированных по имени", async () => {
      repository.create({ name: "US Dollar", ticker: "USD" });
      repository.create({ name: "Euro", ticker: "EUR" });

      const response = await request(appInstance.expressApp)
        .get("/currencies")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBe("Euro");
      expect(response.body[0].ticker).toBe("EUR");
      expect(response.body[1].name).toBe("US Dollar");
      expect(response.body[1].ticker).toBe("USD");
    });
  });

  describe("GET /currencies/:id (Получение по ID)", () => {
    it("должен вернуть 200 OK и объект валюты, если она найдена", async () => {
      const created = repository.create({ name: "Euro", ticker: "EUR" });

      const response = await request(appInstance.expressApp)
        .get(`/currencies/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created);
    });

    it("должен вернуть 404 Not Found, если валюты с таким ID нет", async () => {
      const response = await request(appInstance.expressApp)
        .get("/currencies/non_existent_id")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("не найдена");
    });
  });

  describe("PUT /currencies/:id (Обновление)", () => {
    it("должен успешно обновить переданные поля и вернуть 200 OK", async () => {
      const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

      const response = await request(appInstance.expressApp)
        .put(`/currencies/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ name: "Bitcoin Cash", ticker: "BCH" });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.name).toBe("Bitcoin Cash");
      expect(response.body.ticker).toBe("BCH");
    });

    it("должен вернуть 404, если пытаемся обновить несуществующую валюту", async () => {
      const response = await request(appInstance.expressApp)
        .put("/currencies/non_existent_id")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ name: "New Name" });

      expect(response.status).toBe(404);
    });

    it("должен вернуть 400 Bad Request, если тело запроса пустое", async () => {
      const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

      const response = await request(appInstance.expressApp)
        .put(`/currencies/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("хотя бы одно поле");
    });

    it("должен вернуть 409 Conflict, если измененный тикер занят другой валютой", async () => {
      repository.create({ name: "Bitcoin", ticker: "BTC" });
      const currency2 = repository.create({ name: "Euro", ticker: "EUR" });

      const response = await request(appInstance.expressApp)
        .put(`/currencies/${currency2.id}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ ticker: "BTC" });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("уже зарегистрирована");
    });
  });

  describe("DELETE /currencies/:id (Удаление)", () => {
    it("должен удалить валюту и вернуть 204 No Content", async () => {
      const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

      const response = await request(appInstance.expressApp)
        .delete(`/currencies/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe("");

      expect(repository.findById(created.id)).toBeUndefined();
    });

    it("должен вернуть 404, если удаляемый ID отсутствует в системе", async () => {
      const response = await request(appInstance.expressApp)
        .delete("/currencies/non_existent_id")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /currencies/:id/track и /untrack (Управление трекингом)", () => {
    it("должен включить отслеживание валюты и вернуть 200 OK (Позитивный)", async () => {
      const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

      const response = await request(appInstance.expressApp)
        .post(`/currencies/${created.id}/track`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isTracked).toBe(true);
      expect(repository.findById(created.id)?.isTracked).toBe(true);
    });

    it("должен вернуть 404, если пытаемся включить трекинг несуществующей валюты (Негативный)", async () => {
      const response = await request(appInstance.expressApp)
        .post("/currencies/non_existent_id/track")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it("должен отключить отслеживание валюты и вернуть 200 OK (Позитивный)", async () => {
      const created = repository.create({ name: "Bitcoin", ticker: "BTC" });
      repository.setTracked(created.id, true);

      const response = await request(appInstance.expressApp)
        .post(`/currencies/${created.id}/untrack`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isTracked).toBe(false);
      expect(repository.findById(created.id)?.isTracked).toBe(false);
    });

    it("должен вернуть 404, если пытаемся отключить трекинг несуществующей валюты (Негативный)", async () => {
      const response = await request(appInstance.expressApp)
        .post("/currencies/non_existent_id/untrack")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });
});
