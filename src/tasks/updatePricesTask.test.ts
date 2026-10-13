import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { UpdatePricesTask } from "./updatePricesTask";
import { ICurrencyRepository } from "../currencies/currency.types";
import { IPriceRepository } from "../price/price.types";
import { ICoinMarketCapService } from "../price/coinMarketCap.types";
import { ILogger } from "../utils/logger";

describe("UpdatePricesTask (Unit)", () => {
  let mockCurrencyRepository: jest.Mocked<ICurrencyRepository>;
  let mockPriceRepository: jest.Mocked<IPriceRepository>;
  let mockCoinMarketCapService: jest.Mocked<ICoinMarketCapService>;
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
      findTracked: jest.fn(),
      setTracked: jest.fn(),
    };

    mockPriceRepository = {
      savePrice: jest.fn(),
      getLatestPrice: jest.fn(),
      getHistoryByTicker: jest.fn(),
    };

    mockCoinMarketCapService = {
      getPrices: jest.fn(),
    };

    mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    task = new UpdatePricesTask({
      currencyRepository: mockCurrencyRepository,
      priceRepository: mockPriceRepository,
      coinMarketCapService: mockCoinMarketCapService,
      logger: mockLogger,
    });
  });

  it("должен получить цены из CoinMarketCap и сохранить их для отслеживаемых криптовалют", async () => {
    const mockCurrencies = [
      {
        id: "1",
        name: "Bitcoin",
        ticker: "BTC",
        isTracked: true,
        lastUpdated: null,
      },
      {
        id: "2",
        name: "Ethereum",
        ticker: "ETH",
        isTracked: true,
        lastUpdated: null,
      },
    ];

    mockCurrencyRepository.findTracked.mockReturnValue(mockCurrencies);

    mockCoinMarketCapService.getPrices.mockResolvedValue([
      {
        symbol: "BTC",
        price: "60000.00",
      },
      {
        symbol: "ETH",
        price: "3000.00",
      },
    ]);

    await task.execute();

    expect(mockCurrencyRepository.findTracked).toHaveBeenCalledTimes(1);

    expect(mockCoinMarketCapService.getPrices).toHaveBeenCalledTimes(1);

    expect(mockCoinMarketCapService.getPrices).toHaveBeenCalledWith([
      "BTC",
      "ETH",
    ]);

    expect(mockPriceRepository.savePrice).toHaveBeenCalledTimes(2);

    expect(mockPriceRepository.savePrice).toHaveBeenNthCalledWith(
      1,
      "1",
      "60000.00",
      expect.any(String),
    );

    expect(mockPriceRepository.savePrice).toHaveBeenNthCalledWith(
      2,
      "2",
      "3000.00",
      expect.any(String),
    );

    expect(mockCurrencyRepository.setTracked).toHaveBeenCalledTimes(2);

    expect(mockCurrencyRepository.setTracked).toHaveBeenNthCalledWith(
      1,
      "1",
      true,
      expect.any(String),
    );

    expect(mockCurrencyRepository.setTracked).toHaveBeenNthCalledWith(
      2,
      "2",
      true,
      expect.any(String),
    );
  });

  it("должен логировать успешное завершение задачи", async () => {
    mockCurrencyRepository.findTracked.mockReturnValue([
      {
        id: "1",
        name: "Bitcoin",
        ticker: "BTC",
        isTracked: true,
        lastUpdated: null,
      },
    ]);

    mockCoinMarketCapService.getPrices.mockResolvedValue([
      {
        symbol: "BTC",
        price: "60000.00",
      },
    ]);

    await task.execute();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "Фоновое обновление курсов криптовалют успешно завершено",
      ),
    );
  });

  it("должен залогировать предупреждение и не вызывать CoinMarketCap, если список отслеживаемых криптовалют пуст", async () => {
    mockCurrencyRepository.findTracked.mockReturnValue([]);

    await task.execute();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Нет отслеживаемых криптовалют"),
    );

    expect(mockCoinMarketCapService.getPrices).not.toHaveBeenCalled();

    expect(mockPriceRepository.savePrice).not.toHaveBeenCalled();
  });

  it("должен пробросить ошибку наверх, если CoinMarketCap недоступен", async () => {
    mockCurrencyRepository.findTracked.mockReturnValue([
      {
        id: "1",
        name: "Bitcoin",
        ticker: "BTC",
        isTracked: true,
        lastUpdated: null,
      },
    ]);

    const apiError = new Error("CoinMarketCap API timeout");

    mockCoinMarketCapService.getPrices.mockRejectedValue(apiError);

    await expect(task.execute()).rejects.toThrow("CoinMarketCap API timeout");

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Сбой при фоновом обновлении курсов криптовалют"),
      expect.any(Object),
    );
  });

  it("должен пробросить ошибку, если сохранение цены в БД завершилось ошибкой", async () => {
    mockCurrencyRepository.findTracked.mockReturnValue([
      {
        id: "1",
        name: "Bitcoin",
        ticker: "BTC",
        isTracked: true,
        lastUpdated: null,
      },
    ]);

    mockCoinMarketCapService.getPrices.mockResolvedValue([
      {
        symbol: "BTC",
        price: "60000.00",
      },
    ]);

    const dbError = new Error("SQLite disk image is malformed");

    mockPriceRepository.savePrice.mockImplementation(() => {
      throw dbError;
    });

    await expect(task.execute()).rejects.toThrow(
      "SQLite disk image is malformed",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Сбой при фоновом обновлении курсов криптовалют"),
      expect.any(Object),
    );
  });

  it("должен залогировать предупреждение, если CoinMarketCap не вернул цену для криптовалюты", async () => {
    mockCurrencyRepository.findTracked.mockReturnValue([
      {
        id: "1",
        name: "Rare Coin",
        ticker: "MYCOIN",
        isTracked: true,
        lastUpdated: null,
      },
    ]);

    mockCoinMarketCapService.getPrices.mockResolvedValue([
      {
        symbol: "BTC",
        price: "60000.00",
      },
    ]);

    await task.execute();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "CoinMarketCap не вернул цену для криптовалюты MYCOIN",
      ),
    );

    expect(mockPriceRepository.savePrice).not.toHaveBeenCalled();

    expect(mockCurrencyRepository.setTracked).not.toHaveBeenCalled();
  });
});
