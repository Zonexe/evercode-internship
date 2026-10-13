import axios from "axios";
import { CoinMarketCapHttpService } from "./coinMarketCapService";
import { ILogger } from "../utils/logger";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    isAxiosError: jest.fn(),
  },
  isAxiosError: jest.fn(),
}));

describe("CoinMarketCapHttpService", () => {
  let service: CoinMarketCapHttpService;
  let logger: jest.Mocked<ILogger>;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockGet = jest.fn();

    (axios.create as jest.Mock).mockReturnValue({
      get: mockGet,
    });

    service = new CoinMarketCapHttpService({
      logger,
      apiKey: "test-api-key",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("возвращает цены из ответа API", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          "1": { symbol: "BTC", quote: { USD: { price: 65000 } } },
          "1027": { symbol: "ETH", quote: { USD: { price: 3000 } } },
        },
      },
    });

    await expect(service.getPrices(["BTC", "ETH"])).resolves.toEqual([
      { symbol: "BTC", price: "65000" },
      { symbol: "ETH", price: "3000" },
    ]);
  });

  it("не делает запрос при пустом списке тикеров", async () => {
    await expect(service.getPrices([])).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("нормализует тикеры и удаляет дубликаты и пустые строки", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          "1": { symbol: "BTC", quote: { USD: { price: 65000 } } },
        },
      },
    });

    await service.getPrices([" btc ", "BTC", ""]);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls[0][1].params.symbol).toBe("BTC");
  });

  it("выбрасывает ошибку, если API-ключ не передан", () => {
    expect(
      () =>
        new CoinMarketCapHttpService({
          logger,
          apiKey: "",
        }),
    ).toThrow("Переменная окружения COINMARKETCAP_API_KEY не задана.");
  });

  it("не повторяет запрос при ошибке 401", async () => {
    const error = {
      isAxiosError: true,
      response: { status: 401 },
      message: "Unauthorized",
    };

    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    mockGet.mockRejectedValue(error);

    await expect(service.getPrices(["BTC"])).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("повторяет запрос после ошибки 429", async () => {
    const error = {
      isAxiosError: true,
      response: { status: 429 },
      message: "Too Many Requests",
    };

    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);

    mockGet.mockRejectedValueOnce(error).mockResolvedValueOnce({
      data: {
        data: {
          "1": { symbol: "BTC", quote: { USD: { price: 65000 } } },
        },
      },
    });

    const resultPromise = service.getPrices(["BTC"]);

    await jest.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual([
      { symbol: "BTC", price: "65000" },
    ]);

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("делает не более трёх попыток при повторяющихся ошибках", async () => {
    const error = {
      isAxiosError: true,
      response: { status: 503 },
      message: "Service Unavailable",
    };

    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    mockGet.mockRejectedValue(error);

    // Перехватываем ошибку сразу, чтобы предотвратить Unhandled Promise Rejection
    let caughtError: any;
    const resultPromise = service.getPrices(["BTC"]).catch((e) => {
      caughtError = e;
    });

    // Перематываем таймеры ретраев до упора
    await jest.runAllTimersAsync();

    // Дожидаемся фактического завершения промиса
    await resultPromise;

    expect(caughtError).toBeDefined();
    expect(caughtError).toMatchObject({
      statusCode: 502,
    });

    expect(mockGet).toHaveBeenCalledTimes(3);
  });
});
