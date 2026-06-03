import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import Database from "better-sqlite3";
import { SqliteCurrencyRepository } from "./sqliteCurrencyRepository";

describe("SqliteCurrencyRepository (Integration Tests)", () => {
  let testDb: Database.Database;
  let repository: SqliteCurrencyRepository;

  beforeEach(() => {
    testDb = new Database(":memory:");

    testDb.exec(`
      CREATE TABLE IF NOT EXISTS currencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ticker TEXT NOT NULL UNIQUE
      );
    `);
    repository = new SqliteCurrencyRepository({ database: testDb });
  });

  afterEach(() => {
    testDb.close();
  });

  it("должен успешно создать валюту и найти её по ID", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe("string");
    expect(created.name).toBe("Bitcoin");

    expect(created.ticker).toBe("BTC");

    const found = repository.findById(created.id);
    expect(found).toEqual(created);
  });

  it("должен вернуть undefined при поиске несуществующего ID", () => {
    const found = repository.findById("non-existent-uuid");
    expect(found).toBeUndefined();
  });

  it("должен возвращать все созданные записи через findAll", () => {
    const currency1 = repository.create({ name: "Bitcoin", ticker: "BTC" });
    const currency2 = repository.create({ name: "Ethereum", ticker: "ETH" });

    const all = repository.findAll();

    expect(all).toHaveLength(2);
    expect(all).toContainEqual(currency1);
    expect(all).toContainEqual(currency2);
  });

  it("должен успешно находить валюту по тикеру без учета регистра символов", () => {
    const created = repository.create({ name: "US Dollar", ticker: "USD" });

    const foundExact = repository.findByTicker("USD");
    expect(foundExact).toEqual(created);

    const foundLower = repository.findByTicker("usd");
    expect(foundLower).toEqual(created);

    const foundMixed = repository.findByTicker("uSd");
    expect(foundMixed).toEqual(created);
  });

  it("должен возвращать undefined, если тикер не зарегистрирован", () => {
    const found = repository.findByTicker("NOT_EXIST");
    expect(found).toBeUndefined();
  });

  it("должен успешно обновить переданные поля (name и ticker) существующей валюты", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    const updated = repository.update(created.id, {
      name: "Bitcoin Cash",
      ticker: "BCH",
    });

    expect(updated).toBeDefined();
    expect(updated?.id).toBe(created.id);
    expect(updated?.name).toBe("Bitcoin Cash");
    expect(updated?.ticker).toBe("BCH");

    const found = repository.findById(created.id);
    expect(found).toEqual(updated);
  });

  it("должен частично обновить только name, сохранив старый ticker", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    const updated = repository.update(created.id, { name: "Wrapped Bitcoin" });

    expect(updated?.name).toBe("Wrapped Bitcoin");
    expect(updated?.ticker).toBe("BTC");
  });

  it("должен вернуть undefined при попытке обновить несуществующую валюту", () => {
    const result = repository.update("invalid-id", { name: "New Name" });
    expect(result).toBeUndefined();
  });

  it("должен удалить существующую валюту и вернуть true", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    const isDeleted = repository.delete(created.id);
    expect(isDeleted).toBe(true);

    const found = repository.findById(created.id);
    expect(found).toBeUndefined();
  });

  it("должен вернуть false при попытке удалить несуществующую валюту", () => {
    const isDeleted = repository.delete("non-existent-id");
    expect(isDeleted).toBe(false);
  });
});
