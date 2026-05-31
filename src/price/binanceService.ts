import axios from "axios";
import { ILogger } from "../utils/logger";
import { AppError } from "../errors/AppError";
import { BinancePriceItem, IBinanceService } from "./binance.types";

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price";

export class BinanceHttpService implements IBinanceService {
  private readonly logger: ILogger;

  constructor({ logger }: { logger: ILogger }) {
    this.logger = logger;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async getAllPrices(): Promise<BinancePriceItem[]> {
    const maxAttempts = 3;
    let currentDelay = 500;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Запрос к Binance API. Попытка ${attempt} из ${maxAttempts}...`,
        );

        const response = await axios.get<BinancePriceItem[]>(BINANCE_API_URL, {
          timeout: 5000,
        });

        return response.data;
      } catch (error) {
        lastError = error;

        const isLastAttempt = attempt === maxAttempts;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status && status >= 400 && status < 500 && status !== 429) {
            this.logger.error(
              `Критическая клиентская ошибка при запросе к Binance: ${status}. Прерываем ретраи.`,
              { context: { error: error.message } },
            );
            throw new AppError(
              `Binance API вернул ошибку клиента: ${status}`,
              502,
            );
          }

          this.logger.warn(
            `Попытка запроса ${attempt} завершилась неудачей: ${error.message}. ` +
              (isLastAttempt
                ? "Попытки исчерпаны."
                : `Ожидание ${currentDelay}мс перед следующей...`),
            { context: { status, code: error.code } },
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
      "Не удалось получить данные от Binance API после нескольких попыток.",
      502,
      {
        originalError:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }
}
