import express from "express";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { App } from "../app";
import { ILogger } from "../utils/logger";
import { createAuthMiddleware } from "../middlewares/authMiddleware";
import { InMemoryAddressRepository } from "./addressRepository";
import { AddressController } from "./addressController";
import { createAddressRouter } from "./addressRouter";
import {
  IBlockcypherService,
  AddressBalance,
} from "../blockchain/blockcypher.types";
import { config } from "../config";
import { AppError } from "../errors/AppError";

describe("Address API (Integration)", () => {
  let appInstance: App;
  let repository: InMemoryAddressRepository;
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

    repository = new InMemoryAddressRepository();

    mockBlockcypherService = {
      getBlockchainHeight: jest.fn<() => Promise<number>>(),
      getAddressBalance: jest.fn<() => Promise<AddressBalance>>(),
    } as unknown as jest.Mocked<IBlockcypherService>;

    const addressController = new AddressController({
      addressRepository: repository,
      blockcypherService: mockBlockcypherService,
      logger: loggerMock,
    });

    const addressRouter = createAddressRouter({ addressController });
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
      addressRouter,
      blockchainRouter: express.Router(),
      errorMiddleware: dummyErrorMiddleware,
    });
  });

  describe("Проверка авторизации (Security)", () => {
    it("должен вернуть 403 Forbidden, если токен авторизации отсутствует", async () => {
      const response = await request(appInstance.expressApp).get("/addresses");

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("должен вернуть 403 Forbidden, если передан невалидный токен", async () => {
      const response = await request(appInstance.expressApp)
        .get("/addresses")
        .set("Authorization", "Bearer invalid_token_sample");

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Invalid API token");
    });
  });

  describe("POST /addresses (Создание)", () => {
    it("должен успешно создать отслеживаемый адрес и вернуть 201 OK", async () => {
      const response = await request(appInstance.expressApp)
        .post("/addresses")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
          label: "Genesis Address",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.address).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
      expect(response.body.label).toBe("Genesis Address");
      expect(response.body).toHaveProperty("createdAt");
    });

    it("должен вернуть 400 Bad Request, если поле address пропущено", async () => {
      const response = await request(appInstance.expressApp)
        .post("/addresses")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ label: "Only Label" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("address");
    });

    it("должен вернуть 400 Bad Request, если поле label пустое", async () => {
      const response = await request(appInstance.expressApp)
        .post("/addresses")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
          label: "   ",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("label");
    });

    it("должен вернуть 409 Conflict, если адрес уже отслеживается", async () => {
      repository.create({
        address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        label: "First",
      });

      const response = await request(appInstance.expressApp)
        .post("/addresses")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
          label: "Duplicate",
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("уже отслеживается");
    });
  });

  describe("GET /addresses (Получение списка)", () => {
    it("должен вернуть 200 OK и пустой массив, если записей нет", async () => {
      const response = await request(appInstance.expressApp)
        .get("/addresses")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("должен вернуть список всех отслеживаемых адресов", async () => {
      repository.create({ address: "addr1", label: "Label 1" });
      repository.create({ address: "addr2", label: "Label 2" });

      const response = await request(appInstance.expressApp)
        .get("/addresses")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].address).toBe("addr1");
      expect(response.body[1].address).toBe("addr2");
    });
  });

  describe("GET /addresses/:id (Получение по ID)", () => {
    it("должен вернуть 200 OK и объект адреса, если он найден", async () => {
      const created = repository.create({ address: "addr1", label: "Label 1" });

      const response = await request(appInstance.expressApp)
        .get(`/addresses/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created);
    });

    it("должен вернуть 404 Not Found, если ID не зарегистрирован", async () => {
      const response = await request(appInstance.expressApp)
        .get("/addresses/non_existent_uuid")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("не найден");
    });
  });

  describe("PUT /addresses/:id (Обновление)", () => {
    it("должен успешно обновить переданные поля и вернуть 200 OK", async () => {
      const created = repository.create({
        address: "addr1",
        label: "Old Label",
      });

      const response = await request(appInstance.expressApp)
        .put(`/addresses/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ label: "New Label" });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.label).toBe("New Label");
      expect(response.body.address).toBe("addr1");
    });

    it("должен вернуть 400 Bad Request, если тело запроса абсолютно пустое", async () => {
      const created = repository.create({ address: "addr1", label: "Label" });

      const response = await request(appInstance.expressApp)
        .put(`/addresses/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("хотя бы одно поле");
    });

    it("должен вернуть 404 Not Found, если запись для обновления отсутствует", async () => {
      const response = await request(appInstance.expressApp)
        .put("/addresses/invalid_id")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ label: "New" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /addresses/:id (Удаление)", () => {
    it("должен удалить адрес и вернуть 204 No Content", async () => {
      const created = repository.create({
        address: "addr-to-delete",
        label: "Delete me",
      });

      const response = await request(appInstance.expressApp)
        .delete(`/addresses/${created.id}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
      expect(repository.findById(created.id)).toBeUndefined();
    });

    it("должен вернуть 404 Not Found, если удаляемый адрес не зарегистрирован", async () => {
      const response = await request(appInstance.expressApp)
        .delete("/addresses/invalid-id")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /addresses/:address/balance (Запрос баланса Биткоина)", () => {
    it("должен успешно вернуть 200 OK и детализированный баланс от BlockcypherService", async () => {
      const targetAddress = "1DEP8i3QJCsomS4BSMY2RpU1upv62aGvhD";

      mockBlockcypherService.getAddressBalance.mockResolvedValue({
        address: targetAddress,
        balance: 4433416,
        finalBalance: 4433416,
        totalReceived: 4433416,
        totalSent: 0,
      });

      const response = await request(appInstance.expressApp)
        .get(`/addresses/${targetAddress}/balance`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        address: targetAddress,
        balance: 4433416,
        finalBalance: 4433416,
        totalReceived: 4433416,
        totalSent: 0,
      });

      expect(mockBlockcypherService.getAddressBalance).toHaveBeenCalledWith(
        targetAddress,
      );
    });

    it("должен вернуть 404 Not Found, если Blockcypher зафиксировал невалидный адрес", async () => {
      const invalidAddress = "invalid_btc_address_value";

      mockBlockcypherService.getAddressBalance.mockRejectedValue(
        new AppError(
          `Невалидный Биткоин-адрес или адрес не найден в сети: ${invalidAddress}`,
          404,
        ),
      );

      const response = await request(appInstance.expressApp)
        .get(`/addresses/${invalidAddress}/balance`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Невалидный Биткоин-адрес");
    });
  });
});
