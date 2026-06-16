import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { UpdatePricesTask } from "./updatePricesTask";
import { ICurrencyRepository } from "../currencies/currency.types";
import { IPriceRepository } from "../price/price.types";
import { IBinanceService } from "../price/binance.types";
import { ILogger } from "../utils/logger";

describe("UpdatePricesTask (Unit)", () => {
  let mockCurrencyRepository: jest.Mocked<ICurrencyRepository>;
  let mockPriceRepository: jest.Mocked<IPriceRepository>;
  let mockBinanceService: jest.Mocked<IBinanceService>;
  let mockLogger: jest.Mocked<ILogger>;
  let task: UpdatePricesTask;

  beforeEach(() => {
    mockCurrencyRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTicker: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ICurrencyRepository>;

    mockPriceRepository = {
      savePrices: jest.fn(),
      getPricesByTicker: jest.fn(),
    } as unknown as jest.Mocked<IPriceRepository>;

    mockBinanceService = {
      getAllPrices: jest.fn(),
    } as unknown as jest.Mocked<IBinanceService>;

    mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    task = new UpdatePricesTask({
      currencyRepository: mockCurrencyRepository,
      priceRepository: mockPriceRepository,
      binanceService: mockBinanceService,
      logger: mockLogger,
    });
  });

  it("должен получить цены из Binance и сохранить их для каждой валюты", async () => {
    const mockCurrencies = [
      { id: "1", name: "Bitcoin", ticker: "BTC" },
      { id: "2", name: "Ethereum", ticker: "ETH" },
    ];
    mockCurrencyRepository.findAll.mockReturnValue(mockCurrencies);

    const mockBinancePrices = [
      { symbol: "BTCUSDT", price: "60000.00" },
      { symbol: "BTCEUR", price: "55000.00" },
      { symbol: "ETHUSDT", price: "3000.00" },
      { symbol: "SOLUSDT", price: "150.00" },
    ];
    mockBinanceService.getAllPrices.mockResolvedValue(mockBinancePrices);

    await task.execute();

    expect(mockCurrencyRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockBinanceService.getAllPrices).toHaveBeenCalledTimes(1);

    expect(mockPriceRepository.savePrices).toHaveBeenCalledWith("1", [
      { symbol: "BTCUSDT", price: "60000.00" },
      { symbol: "BTCEUR", price: "55000.00" },
    ]);

    expect(mockPriceRepository.savePrices).toHaveBeenCalledWith("2", [
      { symbol: "ETHUSDT", price: "3000.00" },
    ]);
  });

  it("должен логировать успешное завершение задачи", async () => {
    mockCurrencyRepository.findAll.mockReturnValue([
      { id: "1", name: "Bitcoin", ticker: "BTC" },
    ]);
    mockBinanceService.getAllPrices.mockResolvedValue([
      { symbol: "BTCUSDT", price: "60000.00" },
    ]);

    await task.execute();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "Фоновое обновление курсов валют успешно завершено",
      ),
    );
  });

  it("должен залогировать предупреждение и не вызывать Binance если список валют пуст", async () => {
    mockCurrencyRepository.findAll.mockReturnValue([]);

    await task.execute();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Локальный реестр разрешенных валют пуст"),
    );

    expect(mockBinanceService.getAllPrices).not.toHaveBeenCalled();
    expect(mockPriceRepository.savePrices).not.toHaveBeenCalled();
  });

  it("должен пробросить ошибку наверх если Binance недоступен", async () => {
    mockCurrencyRepository.findAll.mockReturnValue([
      { id: "1", name: "Bitcoin", ticker: "BTC" },
    ]);

    const binanceError = new Error("Network timeout on api.binance.com");
    mockBinanceService.getAllPrices.mockRejectedValue(binanceError);

    await expect(task.execute()).rejects.toThrow(
      "Network timeout on api.binance.com",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Сбой при фоновом обновлении курсов валют"),
      expect.any(Object),
    );
  });

  it("должен пробросить ошибку если priceRepository.savePrices выбросил ошибку", async () => {
    mockCurrencyRepository.findAll.mockReturnValue([
      { id: "1", name: "Bitcoin", ticker: "BTC" },
    ]);
    mockBinanceService.getAllPrices.mockResolvedValue([
      { symbol: "BTCUSDT", price: "60000.00" },
    ]);

    const dbError = new Error("SQLite disk image is malformed");
    mockPriceRepository.savePrices.mockImplementation(() => {
      throw dbError;
    });

    await expect(task.execute()).rejects.toThrow(
      "SQLite disk image is malformed",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Сбой при фоновом обновлении курсов валют"),
      expect.any(Object),
    );
  });

  it("должен логировать предупреждение если для тикера не найдено пар на Binance", async () => {
    mockCurrencyRepository.findAll.mockReturnValue([
      { id: "1", name: "Rare Coin", ticker: "MYCOIN" },
    ]);

    mockBinanceService.getAllPrices.mockResolvedValue([
      { symbol: "BTCUSDT", price: "60000.00" },
    ]);

    await task.execute();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Для тикера MYCOIN не найдено активных торговых пар",
      ),
    );

    expect(mockPriceRepository.savePrices).not.toHaveBeenCalled();
  });
});
