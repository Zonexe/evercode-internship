import axios, { AxiosInstance } from "axios";
import { ILogger } from "../utils/logger";
import { AppError } from "../errors/AppError";
import {
  CoinMarketCapPrice,
  ICoinMarketCapService,
} from "./coinMarketCap.types";

const COINMARKETCAP_API_URL = "https://pro-api.coinmarketcap.com";

interface CoinMarketCapQuote {
  USD: {
    price: number;
  };
}

interface CoinMarketCapApiItem {
  symbol: string;
  quote: CoinMarketCapQuote;
}

interface CoinMarketCapApiResponse {
  data: CoinMarketCapApiItem[];
}

export class CoinMarketCapHttpService implements ICoinMarketCapService {
  private readonly logger: ILogger;
  private readonly httpClient: AxiosInstance;

  constructor({ logger, apiKey }: { logger: ILogger; apiKey: string }) {
    this.logger = logger;

    if (!apiKey) {
      throw new Error("Переменная окружения COINMARKETCAP_API_KEY не задана.");
    }

    this.httpClient = axios.create({
      baseURL: COINMARKETCAP_API_URL,
      timeout: 5000,
      headers: {
        "X-CMC_PRO_API_KEY": apiKey,
        Accept: "application/json",
      },
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async getPrices(tickers: string[]): Promise<CoinMarketCapPrice[]> {
    if (tickers.length === 0) {
      return [];
    }

    const normalizedTickers = [
      ...new Set(tickers.map((ticker) => ticker.trim().toUpperCase())),
    ];

    const maxAttempts = 3;
    let currentDelay = 500;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Запрос к CoinMarketCap API. Попытка ${attempt} из ${maxAttempts}...`,
        );

        const response = await this.httpClient.get<CoinMarketCapApiResponse>(
          "/v1/cryptocurrency/quotes/latest",
          {
            params: {
              symbol: normalizedTickers.join(","),
              convert: "USD",
            },
          },
        );

        return response.data.data.map((item) => ({
          symbol: item.symbol,
          price: String(item.quote.USD.price),
        }));
      } catch (error) {
        lastError = error;

        const isLastAttempt = attempt === maxAttempts;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status && status >= 400 && status < 500 && status !== 429) {
            this.logger.error(
              `CoinMarketCap API вернул клиентскую ошибку: ${status}. Ретраи прекращены.`,
              {
                context: {
                  error: error.message,
                },
              },
            );

            throw new AppError(
              `CoinMarketCap API вернул ошибку: ${status}`,
              502,
            );
          }

          this.logger.warn(
            `Попытка запроса ${attempt} завершилась неудачей: ${error.message}. ` +
              (isLastAttempt
                ? "Попытки исчерпаны."
                : `Ожидание ${currentDelay}мс перед следующей...`),
            {
              context: {
                status,
                code: error.code,
              },
            },
          );
        } else {
          this.logger.warn(
            `Попытка ${attempt} завершилась неизвестной ошибкой. ` +
              (isLastAttempt ? "" : `Ожидание ${currentDelay}мс...`),
            {
              context: {
                error: error instanceof Error ? error.message : String(error),
              },
            },
          );
        }

        if (!isLastAttempt) {
          await this.wait(currentDelay);
          currentDelay *= 2;
        }
      }
    }

    throw new AppError(
      "Не удалось получить данные от CoinMarketCap API после нескольких попыток.",
      502,
      {
        originalError:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }
}
