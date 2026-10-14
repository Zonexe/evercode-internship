import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../db/database";
import { SqliteCurrencyRepository } from "./sqliteCurrencyRepository";

describe("SqliteCurrencyRepository (Integration Tests)", () => {
  let testDb: DatabaseSync;
  let repository: SqliteCurrencyRepository;

  beforeEach(() => {
    testDb = createDatabase(":memory:");
    repository = new SqliteCurrencyRepository({ database: testDb });
  });

  afterEach(() => {
    testDb.close();
  });

  it("должен создать валюту и найти её по ID", () => {
    const created = repository.create({
      name: "Bitcoin",
      ticker: "BTC",
    });

    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe("string");
    expect(created.name).toBe("Bitcoin");
    expect(created.ticker).toBe("BTC");
    expect(created.isTracked).toBe(false);
    expect(created.lastUpdated).toBeNull();

    expect(repository.findById(created.id)).toEqual(created);
  });

  it("должен вернуть undefined при поиске несуществующего ID", () => {
    expect(repository.findById("non-existent-uuid")).toBeUndefined();
  });

  it("должен вернуть все созданные записи через findAll", () => {
    const bitcoin = repository.create({ name: "Bitcoin", ticker: "BTC" });
    const ethereum = repository.create({ name: "Ethereum", ticker: "ETH" });

    const all = repository.findAll();

    expect(all).toHaveLength(2);
    expect(all).toContainEqual(bitcoin);
    expect(all).toContainEqual(ethereum);
  });

  it("должен сортировать валюты по имени через findAll", () => {
    repository.create({ name: "Ethereum", ticker: "ETH" });
    repository.create({ name: "Bitcoin", ticker: "BTC" });
    repository.create({ name: "Cardano", ticker: "ADA" });

    const all = repository.findAll();

    expect(all.map((currency) => currency.name)).toEqual([
      "Bitcoin",
      "Cardano",
      "Ethereum",
    ]);
  });

  it("должен находить валюту по тикеру без учета регистра", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    expect(repository.findByTicker("BTC")).toEqual(created);
    expect(repository.findByTicker("btc")).toEqual(created);
    expect(repository.findByTicker("bTc")).toEqual(created);
  });

  it("должен вернуть undefined, если тикер не зарегистрирован", () => {
    expect(repository.findByTicker("NOT_EXIST")).toBeUndefined();
  });

  it("должен сохранять тикер в верхнем регистре", () => {
    const created = repository.create({
      name: "Bitcoin",
      ticker: "btc",
    });

    expect(created.ticker).toBe("BTC");
    expect(repository.findById(created.id)?.ticker).toBe("BTC");
  });

  it("должен обновить имя и тикер существующей валюты", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    const updated = repository.update(created.id, {
      name: "Bitcoin Cash",
      ticker: "bch",
    });

    expect(updated).toEqual({
      ...created,
      name: "Bitcoin Cash",
      ticker: "BCH",
    });

    expect(repository.findById(created.id)).toEqual(updated);
  });

  it("должен частично обновить имя, сохранив прежний тикер", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    const updated = repository.update(created.id, {
      name: "Wrapped Bitcoin",
    });

    expect(updated?.name).toBe("Wrapped Bitcoin");
    expect(updated?.ticker).toBe("BTC");
  });

  it("должен частично обновить тикер, сохранив прежнее имя", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    const updated = repository.update(created.id, { ticker: "xbt" });

    expect(updated?.name).toBe("Bitcoin");
    expect(updated?.ticker).toBe("XBT");
  });

  it("должен вернуть undefined при обновлении несуществующей валюты", () => {
    expect(
      repository.update("invalid-id", { name: "New Name" }),
    ).toBeUndefined();
  });

  it("должен удалять существующую валюту", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    expect(repository.delete(created.id)).toBe(true);
    expect(repository.findById(created.id)).toBeUndefined();
  });

  it("должен вернуть false при удалении несуществующей валюты", () => {
    expect(repository.delete("non-existent-id")).toBe(false);
  });

  it("должен возвращать только отслеживаемые валюты", () => {
    const bitcoin = repository.create({ name: "Bitcoin", ticker: "BTC" });
    const ethereum = repository.create({ name: "Ethereum", ticker: "ETH" });
    repository.create({ name: "Cardano", ticker: "ADA" });

    repository.setTracked(bitcoin.id, true);
    repository.setTracked(ethereum.id, true);

    const tracked = repository.findTracked();

    expect(tracked).toHaveLength(2);
    expect(tracked.map((currency) => currency.ticker)).toEqual(["BTC", "ETH"]);
    expect(tracked.every((currency) => currency.isTracked)).toBe(true);
  });

  it("должен возвращать отслеживаемые валюты в алфавитном порядке", () => {
    const ethereum = repository.create({ name: "Ethereum", ticker: "ETH" });
    const bitcoin = repository.create({ name: "Bitcoin", ticker: "BTC" });

    repository.setTracked(ethereum.id, true);
    repository.setTracked(bitcoin.id, true);

    expect(repository.findTracked().map((currency) => currency.name)).toEqual([
      "Bitcoin",
      "Ethereum",
    ]);
  });

  it("должен включать отслеживание валюты", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });
    const timestamp = "2026-10-08T12:00:00.000Z";

    const updated = repository.setTracked(created.id, true, timestamp);

    expect(updated).toEqual({
      ...created,
      isTracked: true,
      lastUpdated: timestamp,
    });

    expect(repository.findById(created.id)).toEqual(updated);
  });

  it("должен отключать отслеживание валюты", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });

    repository.setTracked(created.id, true, "2026-10-08T12:00:00.000Z");

    const updated = repository.setTracked(created.id, false);

    expect(updated?.isTracked).toBe(false);
    expect(updated?.lastUpdated).toBe("2026-10-08T12:00:00.000Z");
  });

  it("должен сохранять lastUpdated, если новая дата не передана", () => {
    const created = repository.create({ name: "Bitcoin", ticker: "BTC" });
    const timestamp = "2026-10-08T12:00:00.000Z";

    repository.setTracked(created.id, true, timestamp);
    const updated = repository.setTracked(created.id, true);

    expect(updated?.lastUpdated).toBe(timestamp);
  });

  it("должен вернуть undefined при изменении отслеживания несуществующей валюты", () => {
    expect(repository.setTracked("invalid-id", true)).toBeUndefined();
  });

  it("должен отклонить создание валюты с повторяющимся тикером", () => {
    repository.create({ name: "Bitcoin", ticker: "BTC" });

    expect(() =>
      repository.create({ name: "Another Bitcoin", ticker: "btc" }),
    ).toThrow();
  });
});
