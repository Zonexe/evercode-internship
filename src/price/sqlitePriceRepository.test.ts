import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../db/database";
import { SqlitePriceRepository } from "./sqlitePriceRepository";

describe("SqlitePriceRepository (Integration)", () => {
  let testDb: DatabaseSync;
  let repository: SqlitePriceRepository;

  beforeEach(() => {
    testDb = createDatabase(":memory:");

    const insertCurrency = testDb.prepare(
      "INSERT INTO currencies (id, name, ticker) VALUES (?, ?, ?)",
    );
    insertCurrency.run("test-currency-id", "Bitcoin", "BTC");

    repository = new SqlitePriceRepository({ database: testDb });
  });

  afterEach(() => {
    testDb.close();
  });

  it("должен сохранять новую цену и возвращать её через getLatestPrice", () => {
    repository.savePrice(
      "test-currency-id",
      "65000.50",
      "2026-10-12T10:00:00.000Z",
    );

    const latest = repository.getLatestPrice("test-currency-id");

    expect(latest).toBeDefined();
    expect(latest?.currencyId).toBe("test-currency-id");
    expect(latest?.price).toBe("65000.50");
    expect(latest?.recordedAt).toBe("2026-10-12T10:00:00.000Z");
  });

  it("должен возвращать историю цен по тикеру в порядке убывания даты", () => {
    repository.savePrice(
      "test-currency-id",
      "64000",
      "2026-10-12T09:00:00.000Z",
    );
    repository.savePrice(
      "test-currency-id",
      "66000",
      "2026-10-12T11:00:00.000Z",
    );
    repository.savePrice(
      "test-currency-id",
      "65000",
      "2026-10-12T10:00:00.000Z",
    );

    const history = repository.getHistoryByTicker("BTC", 10);

    expect(history).toHaveLength(3);

    expect(history[0].price).toBe("66000");
    expect(history[1].price).toBe("65000");
    expect(history[2].price).toBe("64000");
  });

  it("должен возвращать undefined, если запрашивается последняя цена для неизвестной валюты", () => {
    const latest = repository.getLatestPrice("non-existent-id");
    expect(latest).toBeUndefined();
  });

  it("должен применять лимит к возвращаемой истории", () => {
    repository.savePrice("test-currency-id", "1", "2026-10-12T09:00:00.000Z");
    repository.savePrice("test-currency-id", "2", "2026-10-12T10:00:00.000Z");
    repository.savePrice("test-currency-id", "3", "2026-10-12T11:00:00.000Z");

    const history = repository.getHistoryByTicker("BTC", 2);

    expect(history).toHaveLength(2);
    expect(history[0].price).toBe("3");
    expect(history[1].price).toBe("2");
  });
});
